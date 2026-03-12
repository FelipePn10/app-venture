import type { ErpScreen } from '@/types/erpScreen';

interface ErpMenuProps {
  screens: ErpScreen[];
  onOpenScreen: (screenCode: string) => void;
}

export function ErpMenu({ screens, onOpenScreen }: ErpMenuProps): JSX.Element {
  return (
    <aside className="erp-menu glass-card" aria-label="Menu de telas do ERP">
      <div className="erp-menu-header">
        <h2>Navegação ERP</h2>
        <p>Selecione o código da rotina para abrir.</p>
      </div>

      <ul>
        {screens.map((screen) => (
          <li key={screen.code}>
            <button type="button" onClick={() => onOpenScreen(screen.code)}>
              <div className="screen-chip">{screen.code}</div>
              <div className="screen-meta">
                <span>{screen.title}</span>
                <small>{screen.description}</small>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
