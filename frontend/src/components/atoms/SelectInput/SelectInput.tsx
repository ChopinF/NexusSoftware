import styles from "./SelectInput.module.css";
import React from "react";

interface SelectOption {
  value: string;
  label: string;
}

export const SelectInput = ({
  label,
  name,
  value,
  onChange,
  options,
  disabled = false,
  defaultOptionLabel = "Select...",
}: {
  label?: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: SelectOption[];
  disabled?: boolean;
  defaultOptionLabel?: string;
}) => (
  <div className={styles.selectWrapper}>
    {label && (
      <label htmlFor={name} className={styles.selectLabel}>
        {label}
      </label>
    )}
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className={styles.selectBase}
    >
      <option value="" disabled>
        {defaultOptionLabel}
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);
