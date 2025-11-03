import React from "react";
import styles from "./AlertMessage.module.css";

const CloseIcon = () => (
  <svg
    xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)"
    width="16"
    height="16"
    fill="currentColor"
    viewBox="0 0 16 16"
  >
    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
  </svg>
);

type AlertType = "success" | "error" | "warning" | "info";

interface AlertMessageProps {
  message: string;
  type: AlertType;
  onClose?: () => void;
  className?: string;
}

const typeStyles: Record<AlertType, string> = {
  info: styles.alertInfo,
  success: styles.alertSuccess,
  warning: styles.alertWarning,
  error: styles.alertError,
};

export const AlertMessage: React.FC<AlertMessageProps> = ({
  message,
  type,
  onClose,
  className = "",
}) => {
  const containerClasses = `
    ${styles.alertContainer}
    ${typeStyles[type]}
    ${className}
  `.trim();

  return (
    <div
      className={containerClasses}
      role={type === "error" ? "alert" : "status"}
      aria-live={type === "error" ? "assertive" : "polite"}
    >
      <p className={styles.alertMessage}>{message}</p>

      {onClose && (
        <button
          type="button"
          className={styles.alertCloseButton}
          onClick={onClose}
          aria-label="Close message"
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
};
