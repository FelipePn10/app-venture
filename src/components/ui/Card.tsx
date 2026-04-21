import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  variant?: 'default' | 'flat' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  hover = false,
  onClick,
  style: customStyle,
}: CardProps): JSX.Element {
  const paddings = {
    none: '0',
    sm: '16px',
    md: '24px',
    lg: '32px',
  };

  const shadows = {
    default: '0 1px 2px rgba(15, 23, 42, 0.04), 0 1px 3px rgba(15, 23, 42, 0.08)',
    flat: 'none',
    elevated: '0 4px 6px rgba(15, 23, 42, 0.02), 0 8px 16px rgba(15, 23, 42, 0.06), 0 16px 32px rgba(15, 23, 42, 0.04)',
  };

  const baseStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    border: variant === 'flat' ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: paddings[padding],
    boxShadow: shadows[variant],
    transition: 'all 150ms ease-out',
    cursor: onClick ? 'pointer' : 'default',
    ...customStyle,
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hover || onClick) {
      e.currentTarget.style.transform = 'translateY(-1px)';
      e.currentTarget.style.boxShadow = shadows.elevated;
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = shadows[variant];
  };

  return (
    <div
      className={className}
      style={baseStyle}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className = '' }: CardHeaderProps): JSX.Element {
  return (
    <div
      className={className}
      style={{
        paddingBottom: '16px',
        marginBottom: '16px',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: ReactNode;
  subtitle?: string;
}

export function CardTitle({ children, subtitle }: CardTitleProps): JSX.Element {
  return (
    <div>
      <h3
        style={{
          fontFamily: "'Outfit', sans-serif",
          fontSize: '18px',
          fontWeight: 600,
          color: '#0f172a',
          margin: 0,
          letterSpacing: '-0.3px',
        }}
      >
        {children}
      </h3>
      {subtitle && (
        <p
          style={{
            fontSize: '13px',
            color: '#64748b',
            margin: '4px 0 0 0',
          }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

interface CardBodyProps {
  children: ReactNode;
  className?: string;
}

export function CardBody({ children, className = '' }: CardBodyProps): JSX.Element {
  return (
    <div className={className} style={{ flex: 1 }}>
      {children}
    </div>
  );
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export function CardFooter({ children, className = '' }: CardFooterProps): JSX.Element {
  return (
    <div
      className={className}
      style={{
        padding: '16px 24px',
        backgroundColor: '#f8fafc',
        borderTop: '1px solid #e2e8f0',
        borderRadius: '0 0 16px 16px',
        margin: '24px -24px -24px -24px',
      }}
    >
      {children}
    </div>
  );
}
