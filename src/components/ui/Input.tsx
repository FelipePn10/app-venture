import type { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export function Input({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  fullWidth = true,
  disabled,
  className = '',
  ...props
}: InputProps): JSX.Element {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: fullWidth ? '100%' : 'auto',
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Inter', sans-serif",
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const inputContainerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const getInputStyle = (): React.CSSProperties => ({
    width: '100%',
    height: '40px',
    padding: '0 14px',
    paddingLeft: leftIcon ? '42px' : '14px',
    paddingRight: rightIcon ? '42px' : '14px',
    fontFamily: "'Inter', sans-serif",
    fontSize: '14px',
    color: error ? '#ef4444' : '#0f172a',
    backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
    border: `1.5px solid ${error ? '#fca5a5' : '#cbd5e1'}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'all 150ms ease-out',
    cursor: disabled ? 'not-allowed' : 'text',
  });

  const iconLeftStyle: React.CSSProperties = {
    position: 'absolute',
    left: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: error ? '#ef4444' : '#94a3b8',
    pointerEvents: 'none',
  };

  const iconRightStyle: React.CSSProperties = {
    position: 'absolute',
    right: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: error ? '#ef4444' : '#94a3b8',
  };

  const helperStyle: React.CSSProperties = {
    fontSize: '12px',
    color: error ? '#ef4444' : '#64748b',
    lineHeight: '1.4',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  };

  return (
    <div style={containerStyle} className={className}>
      {label && (
        <label style={labelStyle}>
          {label}
        </label>
      )}
      <div style={inputContainerStyle}>
        {leftIcon && <span style={iconLeftStyle}>{leftIcon}</span>}
        <input
          disabled={disabled}
          style={getInputStyle()}
          onFocus={(e) => {
            if (!disabled && !error) {
              e.target.style.borderColor = '#5a9a5a';
              e.target.style.boxShadow = '0 0 0 3px rgba(93, 168, 93, 0.2)';
            }
          }}
          onBlur={(e) => {
            if (!error) {
              e.target.style.borderColor = '#cbd5e1';
              e.target.style.boxShadow = 'none';
            }
          }}
          {...props}
        />
        {rightIcon && <span style={iconRightStyle}>{rightIcon}</span>}
      </div>
      {(helperText || error) && (
        <span style={helperStyle}>
          {error && (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6" stroke="#ef4444" strokeWidth="1.5" />
              <path d="M8 5v3.5M8 10h.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          {error || helperText}
        </span>
      )}
    </div>
  );
}
