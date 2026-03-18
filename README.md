# ERP Venture Desktop Frontend

Frontend desktop inicial de um ERP moderno, com foco em **alta performance**, baixo consumo de memória e arquitetura escalável para domínios complexos.

## 1) Stack escolhida e justificativa

### Stack principal
- **Tauri 2 + Rust** (container desktop da aplicação)
- **React + TypeScript + Vite** (camada de UI)
- **React Router** (roteamento)
- **Zustand** (estado global leve)
- **TanStack Query + Axios** (integração HTTP e cache de dados)

### Por que essa stack (sem Wails/Fyne)
1. **Menor consumo de RAM que Electron**: Tauri usa WebView nativo do sistema em vez de embutir Chromium completo.
2. **Performance e footprint melhores para ERP**: ideal para telas densas, formulários e dashboards grandes.
3. **Rust no shell desktop**: base robusta para evoluir segurança, IPC e integrações com SO.
4. **React + TS**: produtividade alta com tipagem para reduzir regressões em produto grande.
5. **Zustand + Query**: separa bem estado local/global e estado assíncrono de servidor, evitando complexidade desnecessária.

---

## 2) Arquitetura e estrutura do projeto

```text
.
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   └── LoginPage.tsx
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx
│   │   │   └── ErpMenu.tsx
│   │   ├── screens/
│   │   │   ├── Fite0200Page.tsx
│   │   │   └── ScreenHostPage.tsx
│   │   └── ui/
│   │       ├── Button.tsx
│   │       └── InputField.tsx
│   ├── routes/
│   │   └── AppRouter.tsx
│   ├── services/
│   │   ├── authService.ts
│   │   └── httpClient.ts
│   ├── store/
│   │   └── authStore.ts
│   ├── styles/
│   │   └── global.css
│   ├── types/
│   │   ├── auth.ts
│   │   └── erpScreen.ts
│   ├── utils/
│   │   └── windowManager.ts
│   └── main.tsx
├── src-tauri/
│   ├── src/
│   │   └── main.rs
│   ├── build.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── .env.example
├── .eslintrc.cjs
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

### Função das pastas principais
- `src/components`: componentes de interface reutilizáveis e telas.
- `src/routes`: configuração de rotas e guardas futuras.
- `src/services`: camada de integração com API (HTTP, autenticação, etc.).
- `src/store`: estado global da aplicação (sessão, preferências, contexto de usuário).
- `src/styles`: tokens visuais e estilos globais (base do Design System).
- `src/types`: contratos de tipos TypeScript.
- `src-tauri`: shell desktop (janela principal, build e empacotamento).

---

## 3) Design System (Light Mode + Verde)

### Diretrizes de UI
- Estilo corporativo, limpo e contemporâneo.
- Tipografia neutra e legível.
- Contrastes suaves para reduzir fadiga visual.
- Destaques e ações primárias em verde.

### Paleta base
- **Primária**: `#1F8A55`
- **Primária (hover)**: `#166A40`
- **Primária suave**: `#D9F2E4`
- **Fundo claro**: `#F6FBF8`
- **Superfície**: `#FFFFFF`
- **Texto principal**: `#1E2A24`
- **Texto secundário**: `#5C6B63`
- **Borda**: `#D5E2DA`
- **Erro**: `#C0392B`

---

## 4) Funcionalidades iniciais implementadas

- Janela desktop inicial via Tauri.
- Rota inicial `/login` em `HashRouter` (compatível com build desktop/file protocol).
- Tela de login sem cadastro com redirecionamento para dashboard após autenticação.
- Dashboard inicial com menu de telas ERP e abertura de cada tela em nova janela desktop.
- Tela de teste implementada: `FITE0200` (Cadastro de Itens) em rota dedicada `/screen/FITE0200`.
- Capabilities Tauri habilitadas para criação/foco de janelas ERP (`src-tauri/capabilities/default.json`).
- Submissão simulada pronta para integração real com API de autenticação Go.
- Estado de autenticação com persistência local para suportar multi-janela.

---

## Como rodar

### Pré-requisitos
- Node.js 20+
- npm 10+
- Rust toolchain
- Dependências de sistema do Tauri (de acordo com seu SO)


### Linux (Ubuntu/Debian) dependências do Tauri
```bash
sudo apt update
sudo apt install -y \
  libwebkit2gtk-4.1-dev \
  libgtk-3-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  patchelf
```

### Desenvolvimento web (UI)
```bash
npm install
npm run dev
```

### Build web
```bash
npm run build
```

### Executar como desktop (Tauri)
```bash
npm run tauri:dev
```

### Erro: `npm error code EJSONPARSE` no `package.json`

Esse erro indica JSON inválido (geralmente vírgula ausente entre scripts).

Se o erro citar algo como `line 14 column 5` após `doctor:package`, normalmente é vírgula ausente entre scripts no `package.json`.
Nesta base, o script `doctor:package` foi simplificado para evitar escape complexo de aspas.

1. Restaure/atualize o arquivo:
```bash
git checkout -- package.json
# ou
git pull
```
2. Valide o JSON:
```bash
npm run doctor:package
```
3. Instale e rode o desktop:
```bash
npm install
npm run tauri:dev
```

### Erro: `Module name, "@tauri-apps/api/webviewWindow" does not resolve to a valid URL`

Causa comum: import dinâmico fora do resolver do Vite/Tauri ou instalação local inconsistente após merge.

Esta base já foi corrigida para usar import dinâmico compatível com Vite/Tauri no `windowManager`.

Passos recomendados no seu ambiente:

```bash
rm -rf node_modules package-lock.json
npm install
npm run tauri:dev
```

Se persistir, valide se o pacote existe:

```bash
npm ls @tauri-apps/api
```

### Erro: `npm error Missing script: "tauri:dev"`

Isso indica que você está em uma versão antiga do branch/local clone. Nesta base, o script já existe no `package.json`.

Atualize seu repositório local e reinstale dependências:

```bash
git pull
npm install
npm run tauri:dev
```

Se ainda falhar, confira os scripts disponíveis:

```bash
npm run
```

> Se você estiver no Linux e receber erro de ícone ausente (`failed to open icon ... src-tauri/icons/icon.png`), esta base já cria automaticamente um ícone padrão no `build.rs` antes do build.


> Se aparecer `npm error could not determine executable to run`, significa que o Tauri CLI não está disponível no projeto. Esta base já inclui `@tauri-apps/cli` em `devDependencies`; rode `npm install` novamente e use `npm run tauri:dev`.

> Para integração com backend Go REST/JSON em desenvolvimento web, use `VITE_API_URL=/api`, configure `VITE_API_PROXY_TARGET=http://localhost:5070` e mantenha `VITE_USE_MOCK_AUTH=false` para evitar o preflight `OPTIONS` direto no backend.

### Integração real com backend e sessão

O frontend agora está preparado para operar com sessão real e rotas reais do backend, incluindo a tela `VENT0800`. Configure o `.env` com os paths abaixo conforme o seu backend:

```bash
VITE_API_URL=/api
VITE_API_PROXY_TARGET=http://localhost:5070
VITE_API_TIMEOUT_MS=15000
VITE_USE_MOCK_AUTH=false
VITE_AUTH_LOGIN_PATH=/users/login
VITE_AUTH_ME_PATH=
VITE_AUTH_LOGIN_FIELD=email
VITE_WAREHOUSE_ENDPOINT=/almoxarifados
VITE_CUSTOMER_LOOKUP_PATH=/clientes
VITE_SUPPLIER_LOOKUP_PATH=/fornecedores
VITE_ESTABLISHMENT_LOOKUP_PATH=/estabelecimentos
```

#### Contratos esperados
- `POST /users/login` (ou o path configurado em `VITE_AUTH_LOGIN_PATH`): recebe `email` e `password` em JSON e retorna ao menos `token` e opcionalmente `userName`, `refreshToken`, `expiresAt` e `user`.
- `GET /auth/me`: opcional. Se o backend não expuser essa rota, deixe `VITE_AUTH_ME_PATH=` vazio para o frontend não chamá-la.
- `GET /almoxarifados/:codigo`: consulta um almoxarifado existente para preencher a `VENT0800`.
- `POST /almoxarifados`: persiste o cadastro da `VENT0800`.
- `GET /clientes/:codigo`, `GET /fornecedores/:codigo`, `GET /estabelecimentos/:codigo`: validam vínculos reais informados na tela.

O cliente HTTP adiciona automaticamente o header `Authorization: Bearer <token>` após o login e limpa a sessão local se a API responder `401`. Em desenvolvimento web, o recomendado é usar `VITE_API_URL=/api` com `VITE_API_PROXY_TARGET=http://localhost:5070`, assim o browser fala com o Vite e o Vite repassa ao backend sem gerar `OPTIONS` de CORS para `/users/login`. O login usa `email` como campo principal e aceita respostas com `token`, `accessToken`, `access_token` ou `data.token`.

### Integração real com backend e sessão

O frontend agora está preparado para operar com sessão real e rotas reais do backend, incluindo a tela `VENT0800`. Configure o `.env` com os paths abaixo conforme o seu backend:

```bash
VITE_API_URL=http://localhost:8080/api
VITE_API_TIMEOUT_MS=15000
VITE_USE_MOCK_AUTH=false
VITE_AUTH_LOGIN_PATH=/auth/login
VITE_AUTH_ME_PATH=/auth/me
VITE_AUTH_LOGIN_FIELD=email
VITE_WAREHOUSE_ENDPOINT=/almoxarifados
VITE_CUSTOMER_LOOKUP_PATH=/clientes
VITE_SUPPLIER_LOOKUP_PATH=/fornecedores
VITE_ESTABLISHMENT_LOOKUP_PATH=/estabelecimentos
```

#### Contratos esperados
- `POST /auth/login` (ou o path configurado, por exemplo `/users/login`): retorna ao menos `token` e opcionalmente `userName`, `refreshToken`, `expiresAt` e `user`.
- `GET /auth/me`: retorna os dados atuais da sessão autenticada.
- `GET /almoxarifados/:codigo`: consulta um almoxarifado existente para preencher a `VENT0800`.
- `POST /almoxarifados`: persiste o cadastro da `VENT0800`.
- `GET /clientes/:codigo`, `GET /fornecedores/:codigo`, `GET /estabelecimentos/:codigo`: validam vínculos reais informados na tela.

O cliente HTTP adiciona automaticamente o header `Authorization: Bearer <token>` após o login e limpa a sessão local se a API responder `401`. O login tenta primeiro o campo configurado em `VITE_AUTH_LOGIN_FIELD` e, em caso de erro compatível, faz fallback para `email`, `username`, `login` e `userName`, além de aceitar respostas com `token`, `accessToken`, `access_token` ou `data.token`.

---

## Fluxo recomendado: desenvolvimento no Linux, entrega para Windows

- **Desenvolva e teste no Linux** com `npm run tauri:dev`.
- O código já está preparado para Linux (dev) e Windows (release), incluindo `windows_subsystem` condicionado ao target Windows em release.
- **Build final Windows**: recomendável gerar em máquina/runner Windows para evitar problemas de toolchain cross-compile.

Comandos úteis:

```bash
# Desenvolvimento desktop no Linux
npm run tauri:dev

# Build desktop (no sistema atual)
npm run tauri:build
```

## Próximos passos recomendados
1. Criar layout autenticado (sidebar, header, área de conteúdo).
2. Adicionar módulo de sessão real (token refresh + interceptors Axios).
3. Definir Design Tokens versionados e biblioteca de componentes corporativa.
4. Incluir testes unitários e E2E (Vitest + Playwright).
5. Implementar observabilidade de frontend (logs, tracing e métricas de UX).


## Resolução de conflito da branch (GitHub)

Se o GitHub indicar conflito nos arquivos `README.md`, `src-tauri/build.rs`, `src-tauri/src/main.rs` e `src/services/authService.ts`, mantenha a versão deste branch (mais recente), que inclui:

- compatibilidade Linux explícita no README;
- fallback automático para `icons/icon.png` no `build.rs`;
- `windows_subsystem` restrito a release Windows no `main.rs`;
- `authService` com fluxo mock/real organizado em funções separadas.
