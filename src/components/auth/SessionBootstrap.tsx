import { useEffect, useState } from 'react';
import { fetchSessionProfile, renewSession } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

/**
 * A partir de quanto tempo restante a sessão é renovada na abertura do app.
 * Metade da validade de um token comum: quem usa o ERP com alguma regularidade
 * nunca chega perto do vencimento, e quem ficou dias fora renova na volta.
 */
const LIMITE_PARA_RENOVAR_MS = 12 * 60 * 60 * 1000;

/**
 * Uma renovação por abertura do app. Em StrictMode o efeito roda duas vezes no
 * desenvolvimento, e sem esta trava o app pediria dois tokens a cada abertura.
 */
let sessaoJaRenovada = false;

/** Distingue "token recusado" de "não consegui perguntar" (404, rede, 5xx). */
function isAuthenticationFailure(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

export function SessionBootstrap({ children }: { children: JSX.Element }): JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const { isAuthenticated, clearAuthData, setUserProfile, millisUntilExpiry, setSessionToken } = useAuthStore(
    (state) => ({
      isAuthenticated: state.isAuthenticated,
      clearAuthData: state.clearAuthData,
      setUserProfile: state.setUserProfile,
      millisUntilExpiry: state.millisUntilExpiry,
      setSessionToken: state.setSessionToken,
    }),
  );

  useEffect(() => {
    async function bootstrapSession(): Promise<void> {
      if (!isAuthenticated()) {
        setIsReady(true);
        return;
      }

      try {
        // Renovação da sessão: com "manter conectado", o token ganha prazo novo
        // a cada abertura, e quem usa o sistema não volta para a tela de login.
        // A recusa do backend (teto de 30 dias, servidor antigo) não derruba
        // nada: a sessão segue com o token atual até ele vencer.
        if (!sessaoJaRenovada && useAuthStore.getState().rememberMe && millisUntilExpiry() < LIMITE_PARA_RENOVAR_MS) {
          sessaoJaRenovada = true;
          const renovada = await renewSession();
          if (renovada) {
            setSessionToken({
              token: renovada.token,
              expiresAt: renovada.expiresAt,
              rememberMe: renovada.rememberMe,
            });
          }
        }
        const profile = await fetchSessionProfile();
        if (profile) {
          setUserProfile({
            userName: profile.userName ?? profile.user?.name,
            user: profile.user,
          });
        }
      } catch (error) {
        // Só uma recusa de autenticação encerra a sessão. Se o endpoint de
        // perfil não existir ou a rede falhar, o token continua válido e o
        // usuário segue conectado — sem isso, reabrir o app derruba a sessão.
        if (isAuthenticationFailure(error)) {
          clearAuthData();
        }
      } finally {
        setIsReady(true);
      }
    }

    void bootstrapSession();
  }, [clearAuthData, isAuthenticated, millisUntilExpiry, setSessionToken, setUserProfile]);

  if (!isReady) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f0f4ee',
          color: '#1a2e22',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Validando sessão...
      </div>
    );
  }

  return children;
}
