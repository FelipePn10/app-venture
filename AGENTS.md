# AGENTS.md — ERP Venture Desktop

O projeto possui dois ambientes: `develop` usa `.env.development`/`dev-api.venturerp.com`; `main` e builds de release usam `.env.production`/`api.venturerp.com`. Nunca misture URLs, tokens ou artefatos entre eles.

Commits não publicam atualizações. Somente `make release VERSION=X.Y.Z`, na `main` limpa e com `gh` autenticado, cria a tag `vX.Y.Z`; essa tag aciona `.github/workflows/release-desktop.yml`. Como `main` é branch protegida, o `release.sh` publica o commit de release via **PR auto-mesclado com admin** (branch `release/vX.Y.Z`) e só então taggeia o commit resultante — não faz push direto. A versão deve permanecer sincronizada em package, Cargo e Tauri. Não fixe versão em componentes.

O `tauri-action` executa `npm run tauri build`, então o `package.json` precisa do script passthrough `"tauri": "tauri"`; sem ele o job falha com `Missing script: "tauri"` antes de gerar instalador/`latest.json`.

O updater usa a chave pública de `tauri.conf.json`; a privada existe somente no GitHub Actions e em backup seguro do proprietário. Nunca registre, imprima ou substitua essa chave em uma alteração comum. Perder a chave impede atualizar instalações existentes.

No boot, `SystemUpdateGate` consulta `/api/version`, aplica `min_client` e só então verifica o catálogo assinado. A trava só é **obrigatória no build de produção** (`import.meta.env.MODE === 'production'`); em desenvolvimento e demo o app segue mesmo com o backend inacessível ou incompatível, para não travar testes locais. Browser/dev não chama plugins nativos. O banner do backend é exclusivo de `ADMIN` e chama somente os endpoints da API; o desktop nunca acessa SSH/Docker.

Antes de modificar releases/updater, leia `RELEASES.md`. Depois rode `npm run test:versioning`, lint, build de produção, `cargo test --locked` e valide no Windows. Não publique tags para testar CI; use branches/PRs.
