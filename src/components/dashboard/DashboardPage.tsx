import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ErpMenu } from '@/components/dashboard/ErpMenu';
import { ERP_SCREENS } from '@/types/erpScreen';
import { openErpScreenWindow } from '@/utils/windowManager';
import { useAuthStore } from '@/store/authStore';

export function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const { userName, clearAuthData } = useAuthStore((state) => ({
    userName: state.userName,
    clearAuthData: state.clearAuthData
  }));

  const [lastOpenedScreen, setLastOpenedScreen] = useState<string | null>(null);
  const welcomeName = useMemo(() => userName ?? 'Usuário', [userName]);

  function handleLogout(): void {
    clearAuthData();
    navigate('/login', { replace: true });
  }

  async function handleOpenScreen(screenCode: string): Promise<void> {
    await openErpScreenWindow(screenCode);
    setLastOpenedScreen(screenCode);
  }

  return (
    <main className="dashboard-layout">
      <header className="dashboard-header glass-card">
        <div>
          <span className="dashboard-kicker">ERP VENTURE</span>
          <h1>Central de Operações</h1>
          <p>Olá, {welcomeName}. Escolha um módulo no menu para abrir em uma nova janela.</p>
        </div>
        <button type="button" className="secondary-button" onClick={handleLogout}>
          Sair
        </button>
      </header>

      <section className="dashboard-content">
        <ErpMenu screens={ERP_SCREENS} onOpenScreen={handleOpenScreen} />

        <article className="dashboard-placeholder glass-card">
          <h2>Visão Geral</h2>
          <p>
            Este painel foi redesenhado para uma navegação limpa e corporativa. O menu lateral
            dispara janelas independentes por tela ERP, mantendo fluxo multi-janela.
          </p>

          <div className="status-card">
            <span>Última tela aberta</span>
            <strong>{lastOpenedScreen ?? 'Nenhuma tela aberta ainda'}</strong>
          </div>

          <div className="quick-actions">
            <button type="button" className="primary-button" onClick={() => handleOpenScreen('FITE0200')}>
              Abrir FITE0200 (teste)
            </button>
          </div>
        </article>
      </section>
    </main>
  );
}
