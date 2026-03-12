import { ERP_SCREENS } from '@/types/erpScreen';

function getScreenTitle(screenCode: string): string {
  const match = ERP_SCREENS.find((screen) => screen.code === screenCode);
  return match ? `${match.code} - ${match.title}` : screenCode;
}

export async function openErpScreenWindow(screenCode: string): Promise<void> {
  const route = `/#/screen/${screenCode}`;

  if ('__TAURI_INTERNALS__' in window) {
    const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');

    const label = `screen-${screenCode.toLowerCase()}`;
    const existingWindow = await WebviewWindow.getByLabel(label);

    if (existingWindow) {
      await existingWindow.setFocus();
      return;
    }

    const screenWindow = new WebviewWindow(label, {
      title: getScreenTitle(screenCode),
      url: route,
      width: 1200,
      height: 760,
      minWidth: 1000,
      minHeight: 620,
      center: true,
      resizable: true
    });

    screenWindow.once('tauri://error', (error) => {
      // eslint-disable-next-line no-console
      console.error('Erro ao abrir janela da tela ERP:', error);
    });

    return;
  }

  window.open(route, '_blank', 'width=1200,height=760');
}
