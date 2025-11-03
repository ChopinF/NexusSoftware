import { useState } from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  src?: string;
  initials?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const Avatar = ({
  src,
  initials,
  size = "md",
  className = "",
}: AvatarProps) => {
  const [hasError, setHasError] = useState(false);

  const avatarClasses = `
      ${styles.avatarBase}
      ${styles[size]}
      ${className}
    `;

  const showImage = src && !hasError;

  return (
    <div
      className={avatarClasses.trim()}
      aria-label={`User avatar${initials ? `: ${initials}` : ""}`}
    >
      {showImage ? (
        <img
          src={src}
          alt={initials || "User avatar"}
          className={styles.avatarImage}
          onError={() => setHasError(true)}
        />
      ) : (
        <span className={styles.initialsFallback}>{initials || "??"}</span>
      )}
    </div>
  );
};
