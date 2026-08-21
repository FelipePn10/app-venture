# Lançamentos do ERP Venture Desktop

## Ambientes e branches

`develop` é desenvolvimento e aponta para `https://dev-api.venturerp.com`. `main` é produção e gera código com `https://api.venturerp.com`. Push comum não instala nada. Somente tag `vX.Y.Z` inicia o workflow de distribuição.

## Primeira preparação

A chave minisign foi criada pelo Tauri. A pública está em `src-tauri/tauri.conf.json`; `TAURI_SIGNING_PRIVATE_KEY` está no GitHub Actions. Mantenha uma cópia privada offline, com acesso restrito. Não gere outra chave para uma release comum: clientes instalados rejeitariam os novos pacotes.

O workflow usa a assinatura do updater, que garante autenticidade do pacote para o aplicativo. MSI/NSIS sem certificado Authenticode comercial ainda podem receber aviso do Windows/SmartScreen; isso é diferente da assinatura obrigatória do updater e não enfraquece a verificação interna.

## Criar uma versão

1. Integre `develop` em `main` após revisão e testes.
2. Confirme que a versão do desktop atende `min_client` do backend que será publicado.
3. Autentique o `gh` (`gh auth status`) — é necessário para publicar na `main` protegida.
4. Rode `make release-check VERSION=1.4.0`.
5. Revise o CHANGELOG e execute `make release VERSION=1.4.0`.
6. O comando sincroniza package/Cargo/Tauri, atualiza o CHANGELOG e cria o commit de release. Como `main` é **branch protegida**, ele publica o commit via **PR auto-mesclado com admin** (branch `release/vX.Y.Z`) e então taggeia o commit resultante de `main`. A tag dispara o pipeline.
7. Acompanhe **Release desktop** no GitHub Actions. O runner Windows gera NSIS e MSI, cria artefatos assinados do updater e publica `latest.json` na GitHub Release.
8. Em uma instalação Windows de homologação, abra o aplicativo anterior, confirme a oferta, instale, reinicie e confira a versão/compatibilidade.

Nunca mova/reutilize uma tag já distribuída. Falhas recebem um patch novo, como `1.4.1`.

## Validar o pipeline sem afetar quem já tem o app

Para exercitar o workflow (após mexer em actions, Node ou nas ferramentas de release) sem oferecer nada aos clientes instalados, taggeie uma **pré-release**:

```bash
git tag -a v1.4.1-1 -m "validação do pipeline (descartável)" HEAD
git push origin refs/tags/v1.4.1-1
```

Duas restrições, ambas descobertas na prática:

1. **O identificador de pré-lançamento precisa ser numérico.** O alvo MSI recusa `v1.4.1-rc.1` com `optional pre-release identifier in app version must be numeric-only and cannot be greater than 65535 for msi target`. Use `-1`, `-2`… e não `-rc.1`, `-beta`.
2. **A tag precisa ter hífen para sair como prerelease.** O workflow deriva `prerelease` de `contains(github.ref_name, '-')`. Isso é o que mantém a RC fora de `/releases/latest` — o endpoint que o updater dos clientes consulta. Sem o hífen, a tag de teste viraria a *latest* e seria oferecida a todo mundo.

Não é preciso commit de bump de versão: o próprio job roda `set-release-version.mjs` a partir do nome da tag. Depois de validar, apague a release e a tag:

```bash
gh release delete v1.4.1-1 --yes --cleanup-tag
```

Confira sempre, ao final, que `releases/latest/download/latest.json` continua apontando para a versão de produção.

## Comportamento no cliente

Ao abrir, o app consulta `/api/version`. Se sua versão for menor que `min_client`, a navegação fica bloqueada e oferece a atualização. Se for compatível, o app consulta `latest.json`; havendo versão maior, mostra “Atualização disponível — instalar agora?”. O plugin baixa, valida a assinatura, instala em modo passivo e reinicia.

Se a API estiver inacessível, a tela oferece nova tentativa em vez de operar sem confirmar compatibilidade. Se apenas o GitHub estiver indisponível, uma versão já compatível continua funcionando.

Em cada chamada à API, o desktop envia `X-ERP-Client-Version`. O backend também
valida esse valor contra `min_client`, para cobrir aplicativos que permaneceram
abertos durante uma atualização. Uma versão incompatível recebe HTTP 426; todas
as janelas bloqueiam novas operações e oferecem somente a instalação obrigatória.

`version` e `min_client` são independentes. Por exemplo, o backend `1.1.7` pode
aceitar o desktop `1.1.9` (e versões anteriores) enquanto seu `min_client`
permanecer abaixo ou igual à versão instalada. Eleve `min_client` somente quando
uma mudança for realmente incompatível e apenas depois que o instalador exigido
estiver publicado e validado.

Na primeira implantação deste contrato, publique o backend (mantendo o
`min_client` atual) antes do novo desktop, pois o backend precisa liberar o novo
cabeçalho no CORS. Só eleve `min_client` em uma release posterior, depois que o
novo desktop estiver disponível no catálogo assinado.

## Diagnóstico

- Ausência de atualização: confira a GitHub Release pública e seu `latest.json`.
- Erro de assinatura: confirme que workflow e aplicativo usam o mesmo par de chaves; não contorne a validação.
- Versão errada: rode `npm run test:versioning` e confira tag, `package.json`, `Cargo.toml` e `tauri.conf.json`.
- Backend indisponível: valide `https://api.venturerp.com/api/version` e certificado TLS.
- Release incompleta: corrija o pipeline e publique uma versão nova; não substitua artefatos de tag já distribuída.
