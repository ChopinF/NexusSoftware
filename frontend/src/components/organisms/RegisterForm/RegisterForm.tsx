import React, { useState, useEffect } from "react";
import styles from "./RegisterForm.module.css";

import { FormField } from "../../molecules/FormField/FormField";
import { Input } from "../../atoms/Input/Input"; // Imported Input atom
import { Button } from "../../atoms/Button/Button";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { AlertMessage } from "../../molecules/AlertMessage/AlertMessage";
import { SelectInput } from "../../atoms/SelectInput/SelectInput";

interface RegisterFormProps {
  onSubmit: (
    name: string,
    email: string,
    password: string,
    role: string,
    country: string,
    city: string
  ) => Promise<void>;
  onLoginClick?: () => void;
}

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

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLoginClick,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [country, setCountry] = useState(COUNTRY_OPTIONS[0].value);
  const [city, setCity] = useState(CITIES_BY_COUNTRY[COUNTRY_OPTIONS[0].value][0]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const availableCities = CITIES_BY_COUNTRY[country] || [];
    setCity(availableCities[0] || "");
  }, [country]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword || !country || !city) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit(name, email, password, "Untrusted", country, city);
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
      <h2 className={styles.formTitle}>Create Account</h2>

      {error && (
        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Full Name" htmlFor="register-name">
          <Input
            type="text"
            id="register-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            autoComplete="name"
            required
          />
        </FormField>

        <FormField label="Email Address" htmlFor="register-email">
          <Input
            type="email"
            id="register-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
            required
          />
        </FormField>

        <FormField label="Password" htmlFor="register-password">
          <Input
            type="password"
            id="register-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="new-password"
            required
          />
        </FormField>

        <FormField label="Confirm Password" htmlFor="register-confirm-password">
          <Input
            type="password"
            id="register-confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="new-password"
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

        <div className={styles.buttonWrapper}>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <Spinner size="sm" /> : "Create Account"}
          </Button>
        </div>
      </form>

      {onLoginClick && (
        <p className={styles.footerLink}>
          Already have an account?{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onLoginClick();
            }}
          >
            Sign In
          </a>
        </p>
      )}
    </div>
  );
};