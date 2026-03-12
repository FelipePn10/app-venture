import type { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: string;
}

export function Button({ children, ...props }: ButtonProps): JSX.Element {
  return (
    <button className="primary-button" {...props}>
      {children}
    </button>
  );
}
