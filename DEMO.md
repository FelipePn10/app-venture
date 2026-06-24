# Ambiente de Apresentação (Demo) — Front PanossoERP

Como rodar o **front-end** apontando para o backend de demonstração (Postgres já
populado com ~1 ano de operação fictícia).

## TL;DR

```bash
# 1) (no repo da API) suba o backend demo:  make demo-bootstrap

# 2a) App DESKTOP (Tauri) em modo demo:
npm run tauri:dev:demo

# 2b) ...ou só no NAVEGADOR (Vite), em http://localhost:5173:
npm run dev:demo
```

Login da demo: **`admin@panossoerp.demo`** / **`Demo@12345`**.

> ⚠️ `npm run dev:demo` abre apenas o front no **navegador**. Para o **app
> desktop** use `npm run tauri:dev:demo` (a primeira execução compila o Rust e
> pode levar alguns minutos). Não rode os dois ao mesmo tempo: ambos usam a
> porta 5173 e o Tauri espera o Vite exatamente em `http://localhost:5173`.

## Como funciona

O Vite tem um `mode` chamado `demo`. O arquivo `.env.demo` sobrescreve o `.env`
base:

| Variável                | Valor demo              |
|-------------------------|-------------------------|
| `VITE_API_URL`          | *(vazio)*               |
| `VITE_API_PROXY_TARGET` | `http://localhost:5072` |
| `VITE_USE_MOCK_AUTH`    | `false` (auth real)     |
| `VITE_AUTH_LOGIN_PATH`  | `/users/login`          |

`VITE_API_URL` fica **vazio** de propósito: o front usa URLs relativas e o
**proxy do Vite** (`vite.config.ts`) encaminha `/api`, `/users`, etc. para o
`PROXY_TARGET` no lado servidor. Assim não há CORS no caminho.

> ⚠️ **Por que não apontar direto para `http://localhost:5072`?** A API demo
> hoje **não envia headers CORS** (`Access-Control-Allow-Origin`), apesar de o
> guia do backend dizer "CORS `*`". Requisição direta do navegador/Tauri é
> bloqueada → **"Network Error"**. O proxy do Vite resolve sem depender do
> backend. (Se o backend passar a enviar CORS, dá para voltar a usar a URL
> direta.)

> ⚠️ **Build estático (`build:demo`) não tem proxy.** Os scripts `*:dev:demo`
> (Vite/Tauri dev) funcionam porque o dev server faz o proxy. Para um instalador
> desktop (`tauri:build:demo`) consumindo a API demo, o backend precisa enviar
> CORS, ou aponte `VITE_API_URL` para a API direta.

## Scripts

| Comando                  | Efeito                                                  |
|--------------------------|---------------------------------------------------------|
| `npm run tauri:dev:demo` | **App desktop (Tauri)** apontando para a API demo.      |
| `npm run dev:demo`       | Dev server (Vite) no navegador apontando para a API demo. |
| `npm run tauri:build:demo` | Build do instalador desktop com as envs de demo.      |
| `npm run build:demo`     | Build web de produção com as envs de demo.              |
| `npm run preview:demo`   | Serve o build web demo localmente.                      |

Os scripts `*:demo` do Tauri usam `src-tauri/tauri.demo.conf.json`, que apenas
troca o `beforeDevCommand`/`beforeBuildCommand` para as variantes `:demo`.

## Pré-requisito: backend demo no ar

```bash
curl http://localhost:5072/health        # {"status":"ok",...}
```

Se não responder, suba a stack no repo da API: `make demo-bootstrap`
(ou `make demo-reset && make demo-bootstrap` para zerar antes de uma apresentação).

## Detalhes que ajudam (vindos do backend)

- **Envelope de resposta:** parte dos endpoints retorna `{"data":[...]}`
  (ex.: `/api/items/`) e parte retorna o array direto (ex.: `/api/customers/`).
  O front já trata ambos.
- **Casing:** maioria `snake_case`; alguns endpoints financeiros vêm em
  `PascalCase` (ex.: `contas-receber/list`).
- **Descrição do item:** vem de `pdm.description_technique` (não há campo `name`).
- **Período dos dados:** 2025-07-01 → hoje (≈12 meses) — bom para gráficos por período.

Documentação completa do backend demo: ver o guia da API (`make demo-*`).

## Exportação de relatórios (PDF / Excel / Word / CSV)

Todas as telas de listagem/relatório têm um botão **Exportar** (dropdown) na
actionbar. Ele envia a tabela visível para `POST /api/reports/export?format=...`
e dispara o download. O **cabeçalho/rodapé profissional, logo, CNPJ, paginação
e usuário são montados no backend** — o front só envia título, colunas, linhas e
metadados de filtro/período.

Como adicionar em uma tela nova:

```tsx
import { ExportButton } from "@/components/ui/ExportButton";
// dentro da actionbar:
<ExportButton title="VXXX0000 — Título" filename="vxxx0000" />
```

Por padrão o `ExportButton` lê a `.fsc-table` visível da própria tela (todas as
linhas, já formatadas em pt-BR, ignorando a coluna "Ações"). Para colunas/linhas
customizadas, passe a prop `build={() => ({ columns, rows, subtitle?, meta? })}`
(ver `Vfin0500Page.tsx`). O botão se esconde para papéis sem permissão
(ADMIN/USER, lido do claim do JWT).

> ⚠️ **Word (.docx):** o backend demo hoje devolve `text/csv` para `format=docx`
> — a geração real de .docx ainda não está implementada no servidor.

## Limitações conhecidas — bugs do BACKEND (não corrigíveis pelo front)

Diagnosticados na demo; precisam de correção no repositório da API:

| Tela / Relatório | Sintoma | Causa raiz |
|------------------|---------|------------|
| R16 Ficha Técnica c/ Custo | `column b.child_item_code does not exist` | coluna real é `child_code` |
| VPRO0210 (APS) | `invalid input syntax for type integer: "NORMAL"` | cast string→int no SQL de OPs abertas |
| VPRO0300 (Custo Padrão) | `404` em `/api/standard-cost/*` | rota não registrada |
| VPRO0500 (Manut. Preventiva) | `invalid created_by UUID: length 0` | backend não preenche `created_by` do JWT |
| VPRO0800 (Configurador) | `404` em `/api/restrictions` | rota não registrada |
