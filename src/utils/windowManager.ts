import { ERP_SCREENS } from '@/types/erpScreen';

interface TauriWebviewWindow {
  setFocus: () => Promise<void>;
  once: (event: 'tauri://created' | 'tauri://error', handler: (event: unknown) => void) => Promise<() => void>;
}

interface TauriWebviewWindowConstructor {
  getByLabel: (label: string) => Promise<TauriWebviewWindow | null>;
  new (label: string, options: Record<string, unknown>): TauriWebviewWindow;
}

function getScreenTitle(screenCode: string): string {
  const match = ERP_SCREENS.find((screen) => screen.code === screenCode);
  return match ? `${match.code} - ${match.title}` : screenCode;
}

function buildScreenRoute(screenCode: string): string {
  return `/#/screen/${encodeURIComponent(screenCode)}`;
}

async function loadTauriWebviewWindow(): Promise<TauriWebviewWindowConstructor | null> {
  try {
    const tauriModule = (await import('@tauri-apps/api/webviewWindow')) as {
      WebviewWindow: TauriWebviewWindowConstructor;
    };

    return tauriModule.WebviewWindow;
  } catch {
    return null;
  }
}

export async function openErpScreenWindow(screenCode: string): Promise<void> {
  const route = buildScreenRoute(screenCode);

  if ('__TAURI_INTERNALS__' in window) {
    const WebviewWindow = await loadTauriWebviewWindow();

    if (WebviewWindow) {
      const label = `screen-${screenCode.toLowerCase()}`;
      const existingWindow = await WebviewWindow.getByLabel(label);

      if (existingWindow) {
        await existingWindow.setFocus();
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const screenWindow = new WebviewWindow(label, {
          title: getScreenTitle(screenCode),
          url: route,
          width: 1220,
          height: 780,
          minWidth: 1024,
          minHeight: 680,
          center: true,
          resizable: true
        });

        screenWindow.once('tauri://created', () => resolve());
        screenWindow.once('tauri://error', (error: unknown) => {
          reject(new Error(String(error)));
        });
      });

      return;
    }
  }

  const popup = window.open(route, '_blank', 'width=1200,height=760');

  if (!popup) {
    throw new Error('Não foi possível abrir a nova janela. Verifique bloqueio de pop-up.');
  }
}
