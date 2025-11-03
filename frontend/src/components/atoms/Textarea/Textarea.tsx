import styles from "./Textarea.module.css";

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  placeholder?: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
}

export const Textarea = ({
  placeholder,
  value,
  onChange,
  className = "",
  rows = 4,
  disabled = false,
  ...props
}: TextareaProps) => {
  const textareaClasses = `
    ${styles.textareaBase}
    ${className}
  `;

  return (
    <textarea
      rows={rows}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={textareaClasses.trim()}
      {...props}
    />
  );
};
