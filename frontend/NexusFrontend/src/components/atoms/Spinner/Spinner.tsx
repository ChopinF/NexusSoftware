import styles from "./Spinner.module.css";

export const Spinner = ({ size = "md", className = "" }) => {
  const spinnerClasses = `
    ${styles.spinnerBase}
    ${styles[size]}
    ${className}
  `;

  return (
    <div
      className={spinnerClasses.trim()}
      role="status"
      aria-label="Loading..."
    >
      <span className={styles.srOnly}>Loading...</span>
    </div>
  );
};
