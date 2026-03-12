import { useMemo } from 'react';
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

  const welcomeName = useMemo(() => userName ?? 'Usuário', [userName]);

  function handleLogout(): void {
    clearAuthData();
    navigate('/login', { replace: true });
  }

  async function handleOpenScreen(screenCode: string): Promise<void> {
    await openErpScreenWindow(screenCode);
  }

  return (
    <main className="dashboard-layout">
      <header className="dashboard-header">
        <div>
          <h1>ERP Venture</h1>
          <p>Bem-vindo, {welcomeName}. Selecione uma tela para abrir em nova janela.</p>
        </div>
        <button type="button" className="secondary-button" onClick={handleLogout}>
          Sair
        </button>
      </header>

      <section className="dashboard-content">
        <ErpMenu screens={ERP_SCREENS} onOpenScreen={handleOpenScreen} />

        <article className="dashboard-placeholder">
          <h2>Painel Inicial</h2>
          <p>
            Este é o dashboard inicial do ERP. Use o menu para abrir telas operacionais
            em novas janelas independentes do app.
          </p>
          <p>
            Tela de teste disponível: <strong>FITE0200 - Cadastro de Itens</strong>.
          </p>
        </article>
      </section>
    </main>
  );
}
