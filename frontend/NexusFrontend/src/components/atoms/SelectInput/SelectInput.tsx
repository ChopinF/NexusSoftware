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
  <div className="w-full">
    {label && (
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>
    )}
    <select
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
