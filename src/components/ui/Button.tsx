import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}: ButtonProps): JSX.Element {
  // const baseStyles = `
  //   inline-flex
  //   items-center
  //   justify-center
  //   gap-2
  //   font-medium
  //   rounded-lg
  //   transition-all
  //   duration-150
  //   ease-out
  //   focus:outline-none
  //   focus-visible:ring-2
  //   focus-visible:ring-offset-2
  //   disabled:opacity-50
  //   disabled:cursor-not-allowed
  //   disabled:transform-none
  //   active:scale-[0.98]
  //   hover:-translate-y-[0.5px]
  // `;

  // const variants = {
  //   primary: `
  //     bg-sage-600
  //     text-white
  //     shadow-sm
  //     hover:bg-sage-700
  //     hover:shadow-md
  //     active:bg-sage-800
  //     focus-visible:ring-sage-400
  //   `,
  //   secondary: `
  //     bg-white
  //     text-slate-700
  //     border
  //     border-slate-300
  //     shadow-sm
  //     hover:bg-slate-50
  //     hover:border-slate-400
  //     hover:shadow-md
  //     active:bg-slate-100
  //     focus-visible:ring-slate-400
  //   `,
  //   ghost: `
  //     bg-transparent
  //     text-slate-600
  //     hover:bg-slate-100
  //     hover:text-slate-900
  //     active:bg-slate-200
  //     focus-visible:ring-slate-400
  //   `,
  //   danger: `
  //     bg-red-600
  //     text-white
  //     shadow-sm
  //     hover:bg-red-700
  //     hover:shadow-md
  //     active:bg-red-800
  //     focus-visible:ring-red-400
  //   `,
  //   success: `
  //     bg-emerald-600
  //     text-white
  //     shadow-sm
  //     hover:bg-emerald-700
  //     hover:shadow-md
  //     active:bg-emerald-800
  //     focus-visible:ring-emerald-400
  //   `,
  // };


  // Convert Tailwind classes to CSS custom properties for inline styles
  const getStyles = () => {
    const style: Record<string, string> = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      fontWeight: '500',
      borderRadius: '8px',
      transition: 'all 150ms cubic-bezier(0, 0, 0.2, 1)',
      outline: 'none',
      cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
      opacity: disabled || isLoading ? '0.5' : '1',
      fontSize: size === 'sm' ? '12px' : size === 'lg' ? '16px' : '14px',
      padding: size === 'sm' ? '6px 12px' : size === 'lg' ? '10px 20px' : '8px 16px',
    };

    if (!disabled && !isLoading) {
      style.transform = 'translateY(0)';
    }

    switch (variant) {
      case 'primary':
        style.backgroundColor = '#3d7a3d';
        style.color = '#ffffff';
        style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.04)';
        break;
      case 'secondary':
        style.backgroundColor = '#ffffff';
        style.color = '#334155';
        style.border = '1px solid #cbd5e1';
        style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.04)';
        break;
      case 'ghost':
        style.backgroundColor = 'transparent';
        style.color = '#475569';
        break;
      case 'danger':
        style.backgroundColor = '#dc2626';
        style.color = '#ffffff';
        break;
      case 'success':
        style.backgroundColor = '#059669';
        style.color = '#ffffff';
        break;
    }

    return style;
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      const target = e.currentTarget;
      target.style.transform = 'translateY(-0.5px)';

      switch (variant) {
        case 'primary':
          target.style.backgroundColor = '#2d5f2d';
          target.style.boxShadow = '0 4px 8px rgba(15, 23, 42, 0.06)';
          break;
        case 'secondary':
          target.style.backgroundColor = '#f8fafc';
          target.style.borderColor = '#94a3b8';
          target.style.boxShadow = '0 4px 8px rgba(15, 23, 42, 0.06)';
          break;
        case 'ghost':
          target.style.backgroundColor = '#f1f5f9';
          target.style.color = '#0f172a';
          break;
        case 'danger':
          target.style.backgroundColor = '#b91c1c';
          break;
        case 'success':
          target.style.backgroundColor = '#047857';
          break;
      }
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    const target = e.currentTarget;
    target.style.transform = 'translateY(0)';

    switch (variant) {
      case 'primary':
        target.style.backgroundColor = '#3d7a3d';
        target.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.04)';
        break;
      case 'secondary':
        target.style.backgroundColor = '#ffffff';
        target.style.borderColor = '#cbd5e1';
        target.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.04)';
        break;
      case 'ghost':
        target.style.backgroundColor = 'transparent';
        target.style.color = '#475569';
        break;
      case 'danger':
        target.style.backgroundColor = '#dc2626';
        break;
      case 'success':
        target.style.backgroundColor = '#059669';
        break;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      e.currentTarget.style.transform = 'scale(0.98)';
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = 'translateY(-0.5px)';
  };

  return (
    <button
      type="button"
      disabled={disabled || isLoading}
      className={className}
      style={getStyles()}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      {...props}
    >
      {isLoading && (
        <span
          style={{
            width: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px',
            height: size === 'sm' ? '12px' : size === 'lg' ? '18px' : '14px',
            border: '2px solid rgba(255,255,255,0.25)',
            borderTopColor: variant === 'secondary' || variant === 'ghost' ? '#3d7a3d' : '#ffffff',
            borderRadius: '50%',
            animation: 'spin 0.65s linear infinite',
            display: 'inline-block',
          }}
        />
      )}
      {!isLoading && leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
}
