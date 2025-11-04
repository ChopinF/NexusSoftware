import React, { useState } from "react";
import styles from "./RegisterForm.module.css";

import { FormField } from "../../molecules/FormField/FormField";
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
    tara: string,
    oras: string
  ) => Promise<void>;
  onLoginClick?: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onLoginClick,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tara, setTara] = useState("");
  const [oras, setOras] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !password || !confirmPassword) {
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
      await onSubmit(name, email, password, "Untrusted", "RO", oras);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unknown error occurred.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
          <input
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
          <input
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
          <input
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
          <input
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
          name="tara"
          value={tara}
          onChange={(e) => setTara(e.target.value)}
          options={[
            { value: "RO", label: "Romania" },
            { value: "BG", label: "Bulgaria" },
            { value: "HU", label: "Hungary" },
          ]}
        />

        <SelectInput
          label="City"
          name="oras"
          value={oras}
          onChange={(e) => setOras(e.target.value)}
          options={[
            { value: "București", label: "București" },
            { value: "Cluj-Napoca", label: "Cluj-Napoca" },
            { value: "Timișoara", label: "Timișoara" },
          ]}
        />

        <div className={styles.buttonWrapper}>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <Spinner size="small" /> : "Create Account"}
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
