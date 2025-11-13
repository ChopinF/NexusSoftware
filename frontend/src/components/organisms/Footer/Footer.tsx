import React from "react";
import styles from "./Footer.module.css";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footerContainer}>
      <div className={styles.footerBottom}>
        <p>&copy; {currentYear} EdgeUp - All rights reserved.</p>
      </div>
    </footer>
  );
};