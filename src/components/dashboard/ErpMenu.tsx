import type { ErpScreen } from '@/types/erpScreen';

interface ErpMenuProps {
  screens: ErpScreen[];
  onOpenScreen: (screenCode: string) => void;
  isLoading: boolean;
}

export function ErpMenu({ screens, onOpenScreen, isLoading }: ErpMenuProps): JSX.Element {
  return (
    <aside className="erp-sidebar" aria-label="Menu de telas do ERP">
      <h2>Rotinas do ERP</h2>
      <p>Selecione uma rotina para abrir em nova janela.</p>

      <ul>
        {screens.map((screen) => (
          <li key={screen.code}>
            <button type="button" onClick={() => onOpenScreen(screen.code)} disabled={isLoading}>
              <div className="screen-code">{screen.code}</div>
              <div className="screen-content">
                <strong>{screen.title}</strong>
                <small>{screen.description}</small>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
