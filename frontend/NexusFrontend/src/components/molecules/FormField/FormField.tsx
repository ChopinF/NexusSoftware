import React from "react";
import styles from "./FormField.module.css";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  error,
  children,
  className = "",
}) => {
  const containerClasses = `
    ${styles.formFieldContainer}
    ${className}
  `;

  return (
    <div className={containerClasses.trim()}>
      <label htmlFor={htmlFor} className={styles.formFieldLabel}>
        {label}
      </label>

      {children}

      {error && (
        <p className={styles.formFieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
