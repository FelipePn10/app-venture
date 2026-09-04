import { useEffect, useState } from 'react';
import { fetchSessionProfile } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

/** Distingue "token recusado" de "não consegui perguntar" (404, rede, 5xx). */
function isAuthenticationFailure(error: unknown): boolean {
  const status = (error as { response?: { status?: number } })?.response?.status;
  return status === 401 || status === 403;
}

export function SessionBootstrap({ children }: { children: JSX.Element }): JSX.Element {
  const [isReady, setIsReady] = useState(false);
  const { isAuthenticated, clearAuthData, setUserProfile } = useAuthStore((state) => ({
    isAuthenticated: state.isAuthenticated,
    clearAuthData: state.clearAuthData,
    setUserProfile: state.setUserProfile,
  }));

  useEffect(() => {
    async function bootstrapSession(): Promise<void> {
      if (!isAuthenticated()) {
        setIsReady(true);
        return;
      }

      try {
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
  }, [clearAuthData, isAuthenticated, setUserProfile]);

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
