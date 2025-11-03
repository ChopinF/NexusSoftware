import styles from "./Input.module.css";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
}

export const Input = ({
  type = "text",
  placeholder,
  value,
  onChange,
  className = "",
  disabled = false,
  ...props
}: InputProps) => {
  const inputClasses = `
    ${styles.inputBase}
    ${className}
  `;

  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={inputClasses.trim()}
      {...props}
    />
  );
};
