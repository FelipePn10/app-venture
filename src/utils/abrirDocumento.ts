/** Abre um documento (PDF, XML) fora do app: navegador padrão no desktop, nova aba na web. */
export async function abrirDocumento(url: string): Promise<void> {
  if ("__TAURI_INTERNALS__" in window) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener");
}
