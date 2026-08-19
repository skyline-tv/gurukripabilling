function FormField({ label, type = 'text', value, onChange, min }) {
  return (
    <label className="picker-label">
      {label}
      <input
        className="text-field"
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export default FormField;
