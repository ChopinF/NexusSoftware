import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useUser } from "../../../contexts/UserContext";

import { Input } from "../../atoms/Input/Input";
import { Textarea } from "../../atoms/Textarea/Textarea";
import { SelectInput } from "../../atoms/SelectInput/SelectInput";
import { Button } from "../../atoms/Button/Button";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { FormField } from "../../molecules/FormField/FormField";
import { AlertMessage } from "../../molecules/AlertMessage/AlertMessage";
import styles from "./EditProductForm.module.css";
import { API_URL } from "../../../config";

const categories = [
  { value: "Electronics", label: "Electronics" },
  { value: "Books", label: "Books" },
  { value: "Clothes", label: "Clothes" },
  { value: "Home", label: "Home" },
  { value: "Other", label: "Other" },
];

export const EditProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { token, user } = useUser();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_URL}/product/${id}`);
        if (!res.ok) {
          throw new Error("Could not fetch product details.");
        }
        const data = await res.json();
        
        if (user && user.id !== data.seller_id && user.role !== "Admin") {
            setError("You are not authorized to edit this product.");
            setIsLoading(false);
            return;
        }

        setTitle(data.title);
        setDescription(data.description);
        setPrice(data.price.toString());
        setCategory(data.category);
      } catch (err) {
        console.error(err);
        setError("Failed to load product data.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id, user]);

  if (user?.role !== "Trusted" && user?.role !== "Admin") {
    return (
      <AlertMessage
        type="error"
        message="Access denied. You need permission to edit ads."
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

    setIsSaving(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("price", price);
    formData.append("category", category);
    
    if (imageFile) {
      formData.append("image", imageFile); 
    }

    try {
      const res = await fetch(`${API_URL}/product/${id}`, {
        method: "PUT", 
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Update failed.");
      }

      await res.json();

      localStorage.setItem("products-updated-signal", new Date().toISOString());
      
      navigate(`/product/${id}`);
      
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error updating product.";
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
      return <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}><Spinner size="lg" /></div>;
  }

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Edit Product</h2>

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
            disabled={isSaving}
            required
          />
        </FormField>

        <FormField label="Description" htmlFor="ad-description">
          <Textarea
            id="ad-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSaving}
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
            disabled={isSaving}
            min="1"
            required
          />
        </FormField>

        <FormField label="New Image (Leave empty to keep current)" htmlFor="ad-image">
          <Input
            type="file"
            id="ad-image"
            accept="image/png, image/jpeg"
            onChange={handleImageChange}
            disabled={isSaving}
          />
        </FormField>

        <SelectInput
          label="Category"
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categories}
          disabled={isSaving}
          defaultOptionLabel="Choose a category..."
        />

        <div className={styles.buttonWrapper}>
          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => navigate(-1)} 
            disabled={isSaving}
            style={{ marginRight: '1rem' }}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? <Spinner size="sm" /> : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
};