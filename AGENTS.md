# AGENTS.md — ERP Venture Desktop

O projeto possui dois ambientes: `develop` usa `.env.development`/`dev-api.venturerp.com`; `main` e builds de release usam `.env.production`/`api.venturerp.com`. Nunca misture URLs, tokens ou artefatos entre eles.

Commits não publicam atualizações. Somente `make release VERSION=X.Y.Z`, na `main` limpa e com `gh` autenticado, cria a tag `vX.Y.Z`; essa tag aciona `.github/workflows/release-desktop.yml`. Como `main` é branch protegida, o `release.sh` publica o commit de release via **PR auto-mesclado com admin** (branch `release/vX.Y.Z`) e só então taggeia o commit resultante — não faz push direto. A versão deve permanecer sincronizada em package, Cargo e Tauri. Não fixe versão em componentes.

O `tauri-action` executa `npm run tauri build`, então o `package.json` precisa do script passthrough `"tauri": "tauri"`; sem ele o job falha com `Missing script: "tauri"` antes de gerar instalador/`latest.json`.

O updater usa a chave pública de `tauri.conf.json`; a privada existe somente no GitHub Actions e em backup seguro do proprietário. Nunca registre, imprima ou substitua essa chave em uma alteração comum. Perder a chave impede atualizar instalações existentes.

No boot, `SystemUpdateGate` consulta `/api/version`, aplica `min_client` e só então verifica o catálogo assinado. A trava só é **obrigatória no build de produção** (`import.meta.env.MODE === 'production'`); em desenvolvimento e demo o app segue mesmo com o backend inacessível ou incompatível, para não travar testes locais. Browser/dev não chama plugins nativos. O banner do backend é exclusivo de `ADMIN` e chama somente os endpoints da API; o desktop nunca acessa SSH/Docker.

Antes de modificar releases/updater, leia `RELEASES.md`. Depois rode `npm run test:versioning`, lint, build de produção, `cargo test --locked` e valide no Windows. Não publique tags para testar CI; use branches/PRs.

## Novidades (release notes) — como escrever

O painel **Novidades** (login e cabeçalho do dashboard, `ReleaseNotesDialog`) lê o **corpo da Release do GitHub** (`FelipePn10/app-venture`) — o mesmo texto que você digita ao publicar `vX.Y.Z`. **É o cliente final que lê isso**, não um desenvolvedor. Portanto o corpo da release é conteúdo de produto, não um changelog técnico. O app formata Markdown básico (títulos `##`, listas `-`, **negrito**), mas **o que estiver escrito ruim aparece ruim**: escreva pensando em quem só usa o ERP.

**Regras de ouro**

1. **Linguagem de pessoa comum.** Descreva o benefício, não a implementação. Nada de nomes de arquivos, funções, endpoints, códigos de tela (VCUT0100), termos como "refactor", "DTO", "tsc", "merge", "commit".
2. **Foque no que muda para o usuário.** "Agora o cadastro de cliente valida o CNPJ automaticamente" — não "adicionada validação de dígito verificador em `validateCNPJOrCPF`".
3. **Agrupe por tema, com títulos curtos.** Use `## Novidades`, `## Melhorias`, `## Correções`. Uma linha por item, começando com `- ` e um verbo no presente ("Adicionamos…", "Corrigimos…", "Deixamos mais rápido…").
4. **Sem ruído de Markdown.** Não use `#` de nível 1, tabelas, blocos de código, HTML nem emojis em excesso. Não cole a lista de commits nem o "Full Changelog" gerado automaticamente (o app já ignora esse rodapé, mas não conte com isso — escreva à mão).
5. **Curto.** 3 a 8 itens por versão. Se não afeta o usuário (ajuste interno, refatoração, dependência), **não entra nas Novidades**.
6. **Título da release** = resumo humano ("Cadastro de clientes mais rápido"), não "v1.0.3" repetido nem a mensagem de commit.

**Modelo**

```markdown
## Novidades
- Descreva a funcionalidade nova pelo que ela faz para o usuário.

## Melhorias
- O que ficou mais rápido, mais simples ou mais claro no dia a dia.

## Correções
- O problema que a pessoa via, agora resolvido (sem jargão técnico).
```

**Exemplo — evite (técnico)**

```markdown
# v1.0.3
* refactor(design): migrate fsc-* to erp-*
* fix: ExportButton scrapeTable selector .erp-grid
* feat: decode JWT claims in authService for userName fallback
```

**Exemplo — publique (para o usuário)**

```markdown
## Melhorias
- Deixamos todas as telas com o novo visual, mais organizado e fácil de ler.
- A exportação de listas (Excel, PDF, CSV) ficou mais confiável.

## Correções
- Ao entrar, o sistema passa a mostrar o seu nome real no topo, não mais "Usuário".
```

Ao preparar um `vX.Y.Z`, escreva primeiro as Novidades neste formato e use-as como corpo da Release. Se estiver gerando as notas a partir de commits, **traduza** cada item relevante para benefício do usuário e descarte o resto.
