import { useEffect, useState } from 'react';
import { fetchSessionProfile } from '@/services/authService';
import { useAuthStore } from '@/store/authStore';

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
      } catch {
        clearAuthData();
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
