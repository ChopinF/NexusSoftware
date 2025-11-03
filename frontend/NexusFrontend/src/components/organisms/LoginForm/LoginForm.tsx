import React, { useState } from "react";
import styles from "./LoginForm.module.css";

import { FormField } from "../../molecules/FormField/FormField";
import { Button } from "../../atoms/Button/Button";
import { Spinner } from "../../atoms/Spinner/Spinner";
import { AlertMessage } from "../../molecules/AlertMessage/AlertMessage";

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onRegisterClick?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onRegisterClick,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);

    try {
      await onSubmit(email, password);
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
      <h2 className={styles.formTitle}>Welcome Back</h2>

      {error && (
        <AlertMessage
          type="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Email Address" htmlFor="login-email">
          <input
            type="email"
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
            required
          />
        </FormField>

        <FormField label="Password" htmlFor="login-password">
          <input
            type="password"
            id="login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            autoComplete="current-password"
            required
          />
        </FormField>

        <div className={styles.buttonWrapper}>
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? <Spinner size="small" /> : "Sign In"}
          </Button>
        </div>
      </form>

      {onRegisterClick && (
        <p className={styles.footerLink}>
          Don't have an account?{" "}
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onRegisterClick();
            }}
          >
            Sign Up
          </a>
        </p>
      )}
    </div>
  );
};
