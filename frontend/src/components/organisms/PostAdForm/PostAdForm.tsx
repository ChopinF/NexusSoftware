// frontend/src/components/organisms/PostAdForm/PostAdForm.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../contexts/UserContext";

// Importă componentele atomice/moleculare
import { Input } from "../../atoms/Input/Input";
import { Textarea } from "../../atoms/Textarea/Textarea";
import { SelectInput } from "../../atoms/SelectInput/SelectInput";
import { Button } from "../../atoms/Button/Button";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { FormField } from "../../molecules/FormField/FormField";
import { AlertMessage } from "../../molecules/AlertMessage/AlertMessage";

// Refolosește stilurile din RegisterForm pentru consistență
import styles from "../RegisterForm/RegisterForm.module.css";

// Categoriile trebuie să corespundă cu cele din backend (db.js)
const categories = [
  { value: "Electronics", label: "Electronics" },
  { value: "Books", label: "Books" },
  { value: "Clothes", label: "Clothes" },
  { value: "Home", label: "Home" },
  { value: "Other", label: "Other" },
];

export const PostAdForm: React.FC = () => {
  const { token, user } = useUser();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verifică dacă utilizatorul are rolul 'Trusted' (conform logicii din backend)
  if (user?.role !== "Trusted") {
    return (
      <AlertMessage
        type="error"
        message="Doar vânzătorii de încredere (Trusted) pot posta anunțuri. Contactează suportul."
      />
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!title || !description || !price || !category) {
      setError("Te rog completează toate câmpurile.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("http://localhost:3000/product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // <-- Trimite token-ul!
        },
        body: JSON.stringify({
          title,
          description,
          price: parseInt(price), // Backend-ul așteaptă un număr
          category,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "A eșuat postarea anunțului.");
      }

      // const newProduct = await res.json(); // Opțional, poți folosi 'newProduct'

      // SUCCES!
      // Redirecționează la pagina principală.
      // HomePage își va da refresh automat la date (din useEffect-ul său).
      navigate("/");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "A apărut o eroare necunoscută.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Postează un Anunț Nou</h2>

      {error && (
        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Titlu Anunț" htmlFor="ad-title">
          <Input
            type="text"
            id="ad-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            required
          />
        </FormField>

        <FormField label="Descriere" htmlFor="ad-description">
          <Textarea
            id="ad-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
            rows={5}
            required
          />
        </FormField>

        <FormField label="Preț (RON)" htmlFor="ad-price">
          <Input
            type="number"
            id="ad-price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={isLoading}
            min="1"
            required
          />
        </FormField>

        <SelectInput
          label="Categorie"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categories}
          disabled={isLoading}
          defaultOptionLabel="Alege o categorie..."
        />

        <div className={styles.buttonWrapper}>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : "Postează Anunțul"}
          </Button>
        </div>
      </form>
    </div>
  );
};