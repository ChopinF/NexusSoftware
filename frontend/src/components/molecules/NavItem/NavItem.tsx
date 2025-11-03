import React from "react";
import styles from "./NavItem.module.css";

interface NavItemProps {
  label: string;
  href: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

export const NavItem: React.FC<NavItemProps> = ({
  label,
  href,
  icon,
  isActive = false,
  className = "",
}) => {
  const wrapperClasses = `
    ${styles.navItem}
    ${className}
  `.trim();

  const linkClasses = `
    ${styles.navLink}
    ${isActive ? styles.navLinkActive : ""}
  `.trim();

  return (
    <div className={wrapperClasses}>
      <a href={href} className={linkClasses}>
        {icon && <span className={styles.navIcon}>{icon}</span>}
        <span>{label}</span>
      </a>
    </div>
  );
};
