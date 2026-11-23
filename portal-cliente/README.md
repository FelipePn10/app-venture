# Portal do cliente — hospedagem (NÃO publicado)

Build web do mesmo front, servido num endereço público (ex.: `cliente.venturerp.com`).
O cliente abre `https://cliente.venturerp.com/#/portal/<empresa>/<token>`; a página procura a
API da `<empresa>` em `https://app.venturerp.com/tenants.json` (só `https`).

Para publicar (projeto Vercel próprio, raiz do repositório, com este `vercel.json`):
1. `vercel link` para um projeto novo (não o `venture-app-portal` dos downloads);
   `vercel deploy --prod --local-config portal-cliente/vercel.json`.
2. Em cada API: `PORTAL_BASE_URL=https://cliente.venturerp.com`, `PORTAL_EMPRESA=<id no
   tenants.json>` e a origem em `CORS_ALLOWED_ORIGINS`.
3. Release do backend. Teste: gerar link na VCLI0500 e abrir num celular fora da rede.

Os cabeçalhos (CSP, sem referrer, sem indexação, sem iframe) estão em `vercel.json`.
