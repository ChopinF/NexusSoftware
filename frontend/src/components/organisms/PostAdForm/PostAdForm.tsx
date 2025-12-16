import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../contexts/UserContext";

import { Input } from "../../atoms/Input/Input";
import { Textarea } from "../../atoms/Textarea/Textarea";
import { SelectInput } from "../../atoms/SelectInput/SelectInput";
import { Button } from "../../atoms/Button/Button";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { FormField } from "../../molecules/FormField/FormField";
import { AlertMessage } from "../../molecules/AlertMessage/AlertMessage";
import styles from "./PostAdForm.module.css";
import { API_URL } from "../../../config";

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
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user?.role !== "Trusted" && user?.role !== "Admin") {
    return (
      <AlertMessage
        type="error"
        message="Only trusted users can post ads. You can submit for trusted account in 'Become Seller'."
      />
    );
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!title || !description || !price || !category) {
      setError("All fields required.");
      return;
    }

    // picture is optional
    // if (!imageFile) {
    //   setError("Add an image of the product.");
    //   return;
    // }

    setIsLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("category", category);
    
    if (imageFile) {
      formData.append("image", imageFile); 
    }

    try {
      const res = await fetch(`${API_URL}/product`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Post ad failed.");
      }

      await res.json();

      localStorage.setItem("products-updated-signal", new Date().toISOString());
      navigate("/");
      
      //const newProduct = await res.json();
      //console.log("Produs postat:", newProduct);
      //window.location.assign("/");
      
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Post a new ad</h2>

      {error && (
        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Title" htmlFor="ad-title">
          <Input
            type="text"
            id="ad-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isLoading}
            required
          />
        </FormField>

        <FormField label="Description" htmlFor="ad-description">
          <Textarea
            id="ad-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
            rows={5}
            required
          />
        </FormField>

        <FormField label="Price (RON)" htmlFor="ad-price">
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

        <FormField label="Product image (optional)" htmlFor="ad-image">
          <Input
            type="file"
            id="ad-image"
            accept="image/png, image/jpeg"
            onChange={handleImageChange}
            disabled={isLoading}
          />
        </FormField>

        <SelectInput
          label="Category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categories}
          disabled={isLoading}
          defaultOptionLabel="Choose a category..."
        />

        <div className={styles.buttonWrapper}>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : "Post ad"}
          </Button>
        </div>
      </form>
    </div>
  );
};