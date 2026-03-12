import type { InputHTMLAttributes } from 'react';

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function InputField({ label, id, ...props }: InputFieldProps): JSX.Element {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input id={id} {...props} />
    </div>
  );
}
