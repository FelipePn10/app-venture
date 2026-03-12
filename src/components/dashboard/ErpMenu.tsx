import type { ErpScreen } from '@/types/erpScreen';

interface ErpMenuProps {
  screens: ErpScreen[];
  onOpenScreen: (screenCode: string) => void;
}

export function ErpMenu({ screens, onOpenScreen }: ErpMenuProps): JSX.Element {
  return (
    <aside className="erp-menu" aria-label="Menu de telas do ERP">
      <h2>Telas do ERP</h2>
      <ul>
        {screens.map((screen) => (
          <li key={screen.code}>
            <button type="button" onClick={() => onOpenScreen(screen.code)}>
              <strong>{screen.code}</strong>
              <span>{screen.title}</span>
              <small>{screen.description}</small>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
