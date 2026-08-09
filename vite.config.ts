import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

function getRoutePrefix(routePath: string | undefined): string | null {
  if (!routePath) return null;
  const normalized = routePath.trim();
  if (!normalized.startsWith('/')) return null;
  const [prefix] = normalized.split('/').filter(Boolean);
  return prefix ? `/${prefix}` : null;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET;

  const prefixes = [
    // rotas configuráveis via .env
    getRoutePrefix(env.VITE_AUTH_LOGIN_PATH),
    getRoutePrefix(env.VITE_AUTH_ME_PATH),
    getRoutePrefix(env.VITE_WAREHOUSE_ENDPOINT),
    getRoutePrefix(env.VITE_CUSTOMER_LOOKUP_PATH),
    getRoutePrefix(env.VITE_SUPPLIER_LOOKUP_PATH),
    getRoutePrefix(env.VITE_ESTABLISHMENT_LOOKUP_PATH),
    // rotas fixas do ERP — sempre devem ir para o backend
    '/api',
    '/structure',
  ].filter((value, index, array): value is string =>
    Boolean(value) && array.indexOf(value) === index,
  );

  const proxy =
    proxyTarget && prefixes.length > 0
      ? Object.fromEntries(
          prefixes.map((prefix) => [
            prefix,
            {
              target: proxyTarget,
              changeOrigin: true,
              secure: false,
            },
          ]),
        )
      : undefined;

  // Porta do dev server. Sem VITE_DEV_PORT o Vite usa o padrão (5173), então
  // dev/demo seguem inalterados; o modo treinamento usa a 5174 e pode rodar
  // junto. strictPort evita cair silenciosamente em outra porta (o Tauri espera
  // exatamente a URL configurada).
  const devPort = Number(env.VITE_DEV_PORT) || undefined;

  const server =
    proxy || devPort
      ? {
          ...(proxy ? { proxy } : {}),
          ...(devPort ? { port: devPort, strictPort: true } : {}),
        }
      : undefined;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server,
  };
});
