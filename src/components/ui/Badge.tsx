interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
}: BadgeProps): JSX.Element {
  const variants = {
    primary: {
      bg: '#dcfce7',
      color: '#166534',
      dotColor: '#22c55e',
    },
    success: {
      bg: '#dcfce7',
      color: '#166534',
      dotColor: '#22c55e',
    },
    warning: {
      bg: '#fef3c7',
      color: '#92400e',
      dotColor: '#f59e0b',
    },
    error: {
      bg: '#fee2e2',
      color: '#991b1b',
      dotColor: '#ef4444',
    },
    info: {
      bg: '#dbeafe',
      color: '#1e40af',
      dotColor: '#3b82f6',
    },
    neutral: {
      bg: '#f1f5f9',
      color: '#475569',
      dotColor: '#94a3b8',
    },
  };

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: size === 'sm' ? '2px 8px' : '4px 10px',
    fontSize: size === 'sm' ? '10px' : '11px',
    fontWeight: 600,
    letterSpacing: '0.4px',
    borderRadius: '9999px',
    whiteSpace: 'nowrap',
    backgroundColor: variants[variant].bg,
    color: variants[variant].color,
  };

  return (
    <span style={style}>
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: variants[variant].dotColor,
          }}
        />
      )}
      {children}
    </span>
  );
}
