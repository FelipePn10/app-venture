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
│   │   └── auth.ts
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
- Tela de login sem cadastro.
- Submissão simulada pronta para integração real com API de autenticação Go.
- Estado de autenticação base em store global.

---

## Como rodar

### Pré-requisitos
- Node.js 20+
- npm 10+
- Rust toolchain
- Dependências de sistema do Tauri (de acordo com seu SO)

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
cargo tauri dev
```

> Para integração com backend Go REST/JSON, ajuste o `VITE_API_URL` e coloque `VITE_USE_MOCK_AUTH=false` no `.env` para usar autenticação real via `/auth/login`.

---

## Próximos passos recomendados
1. Criar layout autenticado (sidebar, header, área de conteúdo).
2. Adicionar módulo de sessão real (token refresh + interceptors Axios).
3. Definir Design Tokens versionados e biblioteca de componentes corporativa.
4. Incluir testes unitários e E2E (Vitest + Playwright).
5. Implementar observabilidade de frontend (logs, tracing e métricas de UX).
