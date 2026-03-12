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

  const [lastOpenedScreen, setLastOpenedScreen] = useState<string>('Nenhuma');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isOpeningScreen, setIsOpeningScreen] = useState(false);

  const welcomeName = useMemo(() => userName ?? 'Usuário', [userName]);

  function handleLogout(): void {
    clearAuthData();
    navigate('/login', { replace: true });
  }

  async function handleOpenScreen(screenCode: string): Promise<void> {
    setFeedbackMessage(null);
    setIsOpeningScreen(true);

    try {
      await openErpScreenWindow(screenCode);
      setLastOpenedScreen(screenCode);
      setFeedbackMessage(`Tela ${screenCode} aberta com sucesso.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao abrir a tela selecionada.';
      setFeedbackMessage(`Erro: ${message}`);
    } finally {
      setIsOpeningScreen(false);
    }
  }

  return (
    <main className="dashboard-layout">
      <header className="dashboard-header">
        <div>
          <span className="dashboard-kicker">ERP VENTURE PLATFORM</span>
          <h1>Dashboard Operacional</h1>
          <p>Bem-vindo, {welcomeName}. Selecione uma rotina para abrir em janela dedicada.</p>
        </div>
        <button type="button" className="secondary-button" onClick={handleLogout}>
          Encerrar sessão
        </button>
      </header>

      <section className="dashboard-body">
        <ErpMenu screens={ERP_SCREENS} onOpenScreen={handleOpenScreen} isLoading={isOpeningScreen} />

        <section className="dashboard-main-panel">
          <article className="overview-card">
            <h2>Visão executiva</h2>
            <p>
              Interface redesenhada com foco corporativo: melhor legibilidade, melhor contraste,
              tipografia profissional e navegação orientada a rotinas ERP.
            </p>

            <div className="metrics-grid">
              <div className="metric-box">
                <span>Telas disponíveis</span>
                <strong>{ERP_SCREENS.length}</strong>
              </div>
              <div className="metric-box">
                <span>Última rotina aberta</span>
                <strong>{lastOpenedScreen}</strong>
              </div>
            </div>

            <button
              type="button"
              className="primary-button"
              onClick={() => handleOpenScreen('FITE0200')}
              disabled={isOpeningScreen}
            >
              {isOpeningScreen ? 'Abrindo...' : 'Abrir FITE0200 (teste)'}
            </button>

            {feedbackMessage ? <p className="feedback-message">{feedbackMessage}</p> : null}
          </article>
        </section>
      </section>
    </main>
  );
}
