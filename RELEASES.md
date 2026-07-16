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

## Comportamento no cliente

Ao abrir, o app consulta `/api/version`. Se sua versão for menor que `min_client`, a navegação fica bloqueada e oferece a atualização. Se for compatível, o app consulta `latest.json`; havendo versão maior, mostra “Atualização disponível — instalar agora?”. O plugin baixa, valida a assinatura, instala em modo passivo e reinicia.

Se a API estiver inacessível, a tela oferece nova tentativa em vez de operar sem confirmar compatibilidade. Se apenas o GitHub estiver indisponível, uma versão já compatível continua funcionando.

## Diagnóstico

- Ausência de atualização: confira a GitHub Release pública e seu `latest.json`.
- Erro de assinatura: confirme que workflow e aplicativo usam o mesmo par de chaves; não contorne a validação.
- Versão errada: rode `npm run test:versioning` e confira tag, `package.json`, `Cargo.toml` e `tauri.conf.json`.
- Backend indisponível: valide `https://api.venturerp.com/api/version` e certificado TLS.
- Release incompleta: corrija o pipeline e publique uma versão nova; não substitua artefatos de tag já distribuída.
