/** Ambiente gravado no token pelo backend ("production" | "training"). */
export function ambienteDoToken(token: string | null | undefined): string {
  try {
    const parte = token?.split(".")[1];
    if (!parte) return "";
    const json = atob(parte.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(parte.length / 4) * 4, "="));
    const env = (JSON.parse(json) as { environment?: unknown }).environment;
    return typeof env === "string" ? env : "";
  } catch {
    return "";
  }
}
