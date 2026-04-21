import { Button } from './Button';

interface Action {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
}

interface ActionBarProps {
  actions: Action[];
  position?: 'top' | 'bottom';
  showDivider?: boolean;
}

export function ActionBar({
  actions,
  position = 'top',
  showDivider = true,
}: ActionBarProps): JSX.Element {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: '#ffffff',
    borderBottom: position === 'top' ? '1px solid #e2e8f0' : 'none',
    borderTop: position === 'bottom' ? '1px solid #e2e8f0' : 'none',
    position: 'sticky',
    top: position === 'top' ? 0 : 'auto',
    bottom: position === 'bottom' ? 0 : 'auto',
    zIndex: 100,
  };

  const dividerStyle: React.CSSProperties = {
    width: '1px',
    height: '24px',
    background: 'linear-gradient(180deg, transparent, #cbd5e1 20%, #cbd5e1 80%, transparent)',
    margin: '0 8px',
  };

  // Separar ações em grupos por variant
  const primaryActions = actions.filter(a => a.variant === 'primary');
  const secondaryActions = actions.filter(a => ['secondary', 'ghost'].includes(a.variant || 'secondary'));
  const dangerActions = actions.filter(a => a.variant === 'danger');

  return (
    <div style={containerStyle}>
      {/* Navegação (primeiro grupo) */}
      {secondaryActions.slice(0, 4).map((action, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
          leftIcon={action.icon}
        >
          {action.label}
        </Button>
      ))}

      {showDivider && secondaryActions.length > 0 && (primaryActions.length > 0 || dangerActions.length > 0) && (
        <div style={dividerStyle} />
      )}

      {/* Ações principais */}
      {primaryActions.map((action, index) => (
        <Button
          key={`primary-${index}`}
          variant="primary"
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
          isLoading={action.isLoading}
          leftIcon={action.icon}
        >
          {action.label}
        </Button>
      ))}

      {/* Espaço flexível */}
      <div style={{ flex: 1 }} />

      {/* Ações destrutivas (à direita, isoladas) */}
      {dangerActions.map((action, index) => (
        <Button
          key={`danger-${index}`}
          variant="danger"
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
          leftIcon={action.icon}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
