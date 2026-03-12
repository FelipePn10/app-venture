declare module '@tauri-apps/api/webviewWindow' {
  export interface WebviewOptions {
    title?: string;
    url?: string;
    width?: number;
    height?: number;
    minWidth?: number;
    minHeight?: number;
    center?: boolean;
    resizable?: boolean;
  }

  export class WebviewWindow {
    constructor(label: string, options?: WebviewOptions);
    static getByLabel(label: string): Promise<WebviewWindow | null>;
    setFocus(): Promise<void>;
    once(event: 'tauri://created' | 'tauri://error', handler: (event: unknown) => void): Promise<() => void>;
  }
}
