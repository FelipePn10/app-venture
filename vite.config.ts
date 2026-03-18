import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

function getRoutePrefix(routePath: string | undefined): string | null {
  if (!routePath) {
    return null;
  }

  const normalized = routePath.trim();
  if (!normalized.startsWith('/')) {
    return null;
  }

  const [prefix] = normalized.split('/').filter(Boolean);
  return prefix ? `/${prefix}` : null;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET;
  const prefixes = [
    getRoutePrefix(env.VITE_AUTH_LOGIN_PATH),
    getRoutePrefix(env.VITE_AUTH_ME_PATH),
    getRoutePrefix(env.VITE_WAREHOUSE_ENDPOINT),
    getRoutePrefix(env.VITE_CUSTOMER_LOOKUP_PATH),
    getRoutePrefix(env.VITE_SUPPLIER_LOOKUP_PATH),
    getRoutePrefix(env.VITE_ESTABLISHMENT_LOOKUP_PATH),
  ].filter((value, index, array): value is string => Boolean(value) && array.indexOf(value) === index);

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

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: proxy ? { proxy } : undefined,
  };
});
