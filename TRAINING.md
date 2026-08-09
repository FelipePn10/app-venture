# Ambiente de Treinamento — Front VentureERP

Como rodar o **front-end** apontando para o backend de **treinamento**: banco
isolado, credenciais próprias (instrutor + alunos) e o mesmo dataset de ~1 ano
de operação fictícia. Feito para percorrer as telas em aula sem risco algum —
nada aqui encosta em produção, demo ou development.

## TL;DR

```bash
# 1) (no repo da API) suba o backend de treinamento:
make training-init && make training-bootstrap

# 2a) App DESKTOP (Tauri) em modo treinamento:
npm run tauri:dev:training

# 2b) ...ou só no NAVEGADOR (Vite), em http://localhost:5174:
npm run dev:training
```

Login: **`instrutor@venturerp.training`** (senha em
`deploy/training/training.env`, chave `TRAINING_ADMIN_PASSWORD`) ou
**`aluno01@venturerp.training`** … `aluno12@` (chave
`TRAINING_TRAINEE_PASSWORD`).

---

## Portas — dá para rodar junto com a demo

| Ambiente     | Vite | API backend |
|--------------|------|-------------|
| dev / demo   | 5173 | 5070 / 5072 |
| treinamento  | **5174** | **5073** |

O modo `training` fixa a porta 5174 (`VITE_DEV_PORT` no `.env.training`, com
`strictPort`), então treinamento e demo convivem. O que **não** dá é rodar
`npm run dev:training` e `npm run tauri:dev:training` ao mesmo tempo: os dois
usam a 5174, e o Tauri espera o Vite exatamente em `http://localhost:5174`.

## Como funciona

O Vite tem um `mode` chamado `training`; o `.env.training` sobrescreve o `.env`:

| Variável                | Valor treinamento       |
|-------------------------|-------------------------|
| `VITE_DEV_PORT`         | `5174`                  |
| `VITE_API_URL`          | *(vazio)*               |
| `VITE_API_PROXY_TARGET` | `http://localhost:5073` |
| `VITE_AUTH_LOGIN_PATH`  | `/users/login`          |

`VITE_API_URL` fica **vazio** de propósito: o front usa URLs relativas e o
**proxy do Vite** (`vite.config.ts`) encaminha `/api`, `/users`, etc. para o
`PROXY_TARGET` no lado servidor — sem CORS no caminho.

## Scripts

| Comando                      | Efeito                                                     |
|------------------------------|------------------------------------------------------------|
| `npm run tauri:dev:training` | **App desktop (Tauri)** apontando para a API de treinamento. |
| `npm run dev:training`       | Dev server (Vite) no navegador, porta 5174.                |
| `npm run tauri:build:training` | Build do instalador desktop com as envs de treinamento.  |
| `npm run build:training`     | Build web com as envs de treinamento.                      |
| `npm run preview:training`   | Serve o build web de treinamento localmente.               |

Os scripts `*:training` do Tauri usam `src-tauri/tauri.training.conf.json`, que
troca os comandos de build para as variantes `:training`, aponta a `devUrl` para
a 5174 e usa **identificador próprio** (`com.venture.erp.training`) — ou seja,
o app de treinamento tem sua própria pasta de dados e não compartilha sessão com
o app instalado do cliente.

> ⚠️ **Build estático (`build:training`) não tem proxy.** Os scripts de *dev*
> funcionam porque o dev server faz o proxy. Para um instalador consumindo a API
> de treinamento, o backend precisa enviar CORS (o compose de treinamento já
> envia `*`) ou aponte `VITE_API_URL` direto para `http://127.0.0.1:5073`.

## Sem auto-atualização

Em modo `training` o app desktop **não checa atualizações**
(`checkDesktopUpdate()` retorna `null`): o catálogo do updater é o de produção, e
instalar aquele build tiraria a turma do ambiente isolado. A trava de
compatibilidade de versão (`SystemUpdateGate`) também só bloqueia em
`production`, então o treinamento nunca fica preso numa tela de "atualize".

## Pré-requisito: backend de treinamento no ar

```bash
curl http://127.0.0.1:5073/health        # {"status":"ok",...}
```

Se não responder, no repo da API: `make training-bootstrap`
(ou `make training-reset && make training-bootstrap` para zerar antes da turma).

Guia completo do backend: `docs/dev/training-environment.md` no repo da API.

## Contas

| Conta                          | Papel   | Para quê                                     |
|--------------------------------|---------|----------------------------------------------|
| `instrutor@venturerp.training` | `ADMIN` | conduzir a aula, resetar, aprovar            |
| `aluno01@` … `aluno12@`        | `ADMIN` | cada aluno na sua conta, todas as telas liberadas |
| `operador@venturerp.training`  | `USER`  | mostrar o perfil restrito (403 em telas de ADMIN) |

Quantidade de alunos, senhas e papel são configuráveis em
`deploy/training/training.env` (repo da API) + `make training-users`.

## Convenções do backend (iguais às da demo)

- **Envelope de resposta:** parte dos endpoints retorna `{"data":[...]}` e parte
  retorna o array direto. O front já trata ambos.
- **Casing:** maioria `snake_case`; alguns endpoints financeiros vêm em
  `PascalCase`.
- **Descrição do item:** vem de `pdm.description_technique` (não há campo `name`).
- **Período dos dados:** 2025-07-01 → hoje (≈12 meses) — bom para gráficos por
  período e relatórios.

Detalhes e limitações conhecidas do dataset: ver `DEMO.md` (mesmo dataset).
