import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EditProfileForm.module.css";

import { useUser } from "../../../contexts/UserContext";
import { FormField } from "../../molecules/FormField/FormField";
import { Input } from "../../atoms/Input/Input";
import { Button } from "../../atoms/Button/Button";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { AlertMessage } from "../../molecules/AlertMessage/AlertMessage";
import { SelectInput } from "../../atoms/SelectInput/SelectInput";
import { API_URL } from "../../../config";

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  RO: ["București", "Cluj-Napoca", "Iași", "Timișoara"],
  DE: ["Berlin", "Munich", "Hamburg"],
  FR: ["Paris", "Lyon"],
  UK: ["London", "Manchester"],
};

const COUNTRY_OPTIONS = [
  { value: "RO", label: "Romania" },
  { value: "DE", label: "Germany" },
  { value: "FR", label: "France" },
  { value: "UK", label: "United Kingdom" },
];

export const EditProfileForm: React.FC = () => {
  const { user, token, setUser } = useUser();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState(COUNTRY_OPTIONS[0].value);
  const [city, setCity] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      const userCountry = user.country && CITIES_BY_COUNTRY[user.country] ? user.country : "RO";
      setCountry(userCountry);
      

      const availableCities = CITIES_BY_COUNTRY[userCountry] || [];
      if (user.city && availableCities.includes(user.city)) {
        setCity(user.city);
      } else {
        setCity(availableCities[0] || "");
      }
    } else {
        navigate("/login");
    }
  }, [user, navigate]);

  useEffect(() => {
    const availableCities = CITIES_BY_COUNTRY[country] || [];
    if (!availableCities.includes(city)) {
        setCity(availableCities[0] || "");
    }
  }, [country, city]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatarFile(e.target.files[0]);
    } else {
      setAvatarFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !country || !city) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("email", email);
      formData.append("country", country);
      formData.append("city", city);
      
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }

      const res = await fetch(`${API_URL}/user/profile`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const updatedUser = await res.json();
      
      // Update Context
      setUser(updatedUser);
      
      navigate("/profile");
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const cityOptions = (CITIES_BY_COUNTRY[country] || []).map((c) => ({
    value: c,
    label: c,
  }));

  return (
    <div className={styles.formContainer}>
      <h2 className={styles.formTitle}>Edit Profile</h2>

      {error && (
        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Full Name" htmlFor="profile-name">
          <Input
            type="text"
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />
        </FormField>

        <FormField label="Email Address" htmlFor="profile-email">
          <Input
            type="email"
            id="profile-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            required
          />
        </FormField>

        <SelectInput
          label="Country"
          name="country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          options={COUNTRY_OPTIONS}
          disabled={isLoading}
        />

        <SelectInput
          label="City"
          name="city"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          options={cityOptions}
          disabled={isLoading}
        />

        <FormField label="Avatar (Optional)" htmlFor="profile-avatar">
            <Input 
                type="file" 
                id="profile-avatar"
                accept="image/png, image/jpeg"
                onChange={handleImageChange}
                disabled={isLoading}
            />
        </FormField>

        <div className={styles.buttonWrapper}>
            <Button 
                type="button" 
                variant="secondary" 
                onClick={() => navigate("/profile")}
                disabled={isLoading}
                style={{ marginRight: '1rem' }}
            >
                Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={isLoading}>
                {isLoading ? <Spinner size="sm" /> : "Save Changes"}
            </Button>
        </div>
      </form>
    </div>
  );
};