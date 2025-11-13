import styles from "./Logo.module.css";

export const Logo = ({ size = "md", className = "" }) => {
  const logoClasses = `
    ${styles.logoBase}
    ${styles[size]}
    ${className}
  `;

  return (
    <div className={logoClasses.trim()}>
      Edge<span className={styles.logoAccent}>Up</span>
    </div>
  );
};
