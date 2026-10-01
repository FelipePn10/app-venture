#!/usr/bin/env bash
#
# Publica o portal de instalação em app.venturerp.com (idempotente).
#
# O cliente deixa de receber um link para a página de releases do GitHub e passa a
# receber um endereço da Venture. O portal é estático e mora na Vercel, onde já
# ficam os nameservers do domínio — por isso não depende de registro DNS novo nem
# de nginx na VPS.
#
# O que sobe:
#   index.html            → https://app.venturerp.com/
#   tenants.json          → catálogo domínio de e-mail → endereço da API
#   updates/latest.json   → canal de atualização automática do desktop
#   vercel.json           → cabeçalhos e o redirecionamento de /downloads/
#
# O manifesto mantém as URLs apontando para o GitHub de propósito: é o MESMO
# arquivo que o updater do aplicativo consome, e trocar essas URLs por um
# redirecionamento arriscaria o canal de atualização de quem já usa o sistema. O
# download pelo navegador, que segue redirecionamento sem dúvida, passa por
# /downloads/<arquivo> no domínio da Venture.
#
# Uso:
#   ./scripts/publish-portal.sh                 # versão do package.json
#   ./scripts/publish-portal.sh 1.3.1
#   ./scripts/publish-portal.sh --somente-catalogo   # não atualiza o manifesto
#   ./scripts/publish-portal.sh --conferir           # prepara e confere, sem subir
#
# Variáveis:
#   PORTAL_URL      endereço público      (padrão: https://app.venturerp.com)
#   VERCEL_SCOPE    time na Vercel        (padrão: felipe-panossos-projects)
#   VERCEL_PROJECT  projeto na Vercel     (padrão: venture-app-portal)
#   GH_REPO         repositório dos artefatos (padrão: FelipePn10/app-venture)
set -Eeuo pipefail

PORTAL_URL="${PORTAL_URL:-https://app.venturerp.com}"
VERCEL_SCOPE="${VERCEL_SCOPE:-felipe-panossos-projects}"
VERCEL_PROJECT="${VERCEL_PROJECT:-venture-app-portal}"
GH_REPO="${GH_REPO:-FelipePn10/app-venture}"

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PORTAL_DIR="${REPO_DIR}/portal"
VERSION=""
SOMENTE_CATALOGO=0
CONFERIR=0

die() { printf 'publish-portal: %s\n' "$1" >&2; exit 1; }
info() { printf '  %s\n' "$1"; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --somente-catalogo) SOMENTE_CATALOGO=1; shift ;;
    --conferir) CONFERIR=1; shift ;;
    -h|--help) sed -n '2,33p' "$0"; exit 0 ;;
    -*) die "opção desconhecida: $1" ;;
    *) [[ -z "${VERSION}" ]] || die "informe apenas uma versão"; VERSION="$1"; shift ;;
  esac
done

for cmd in jq node npx; do command -v "${cmd}" >/dev/null || die "faltando: ${cmd}"; done
[[ -f "${PORTAL_DIR}/index.html" ]] || die "não achei portal/index.html"
[[ -f "${PORTAL_DIR}/tenants.json" ]] || die "não achei portal/tenants.json"
[[ -f "${PORTAL_DIR}/vercel.json" ]] || die "não achei portal/vercel.json"

# ── Catálogo ─────────────────────────────────────────────────────────────────
jq -e '.defaultApiUrl and (.tenants | type == "array")' "${PORTAL_DIR}/tenants.json" >/dev/null \
  || die "portal/tenants.json não tem defaultApiUrl e tenants"
# A mesma conferência que o app faz ao ler o catálogo, antes de publicar: um
# apiUrl que o app recusaria faria o cliente cair no servidor da outra empresa.
node "${REPO_DIR}/scripts/test-tenant-directory.mjs" >/dev/null \
  || die "os testes do catálogo falharam; corrija antes de publicar"
info "catálogo conferido pelos testes do app"

# ── Manifesto de atualização ─────────────────────────────────────────────────
if [[ "${SOMENTE_CATALOGO}" == "0" ]]; then
  command -v gh >/dev/null || die "faltando: gh (ou use --somente-catalogo)"
  if [[ -z "${VERSION}" ]]; then
    VERSION="$(jq -r '.version' "${REPO_DIR}/package.json")"
    [[ -n "${VERSION}" && "${VERSION}" != "null" ]] || die "não consegui ler a versão do package.json"
  fi
  VERSION="${VERSION#v}"

  temp="$(mktemp -d)"
  trap 'rm -rf "${temp}"' EXIT
  gh release download "v${VERSION}" --repo "${GH_REPO}" --pattern latest.json --dir "${temp}" \
    || die "a release v${VERSION} de ${GH_REPO} não tem latest.json"

  publicada="$(jq -r '.version' "${temp}/latest.json")"
  [[ "${publicada#v}" == "${VERSION}" ]] \
    || die "o manifesto da release diz ${publicada}, mas pedi ${VERSION}"

  # Todo arquivo apontado pelo manifesto precisa existir na release, senão o
  # updater baixaria um 404 e o cliente ficaria preso na versão antiga.
  while read -r arquivo; do
    gh release view "v${VERSION}" --repo "${GH_REPO}" --json assets \
      --jq '.assets[].name' | grep -qxF "${arquivo}" \
      || die "o manifesto aponta ${arquivo}, que não está nos artefatos da release"
  done < <(jq -r '.platforms[].url | split("/") | last' "${temp}/latest.json" | sort -u)

  # As notas longas saem: o app mostra as novidades pela própria tela, e o
  # manifesto só precisa de versão, data, URL e assinatura.
  mkdir -p "${PORTAL_DIR}/updates"
  jq '.notes = "Consulte as novidades no aplicativo."' "${temp}/latest.json" \
    >"${PORTAL_DIR}/updates/latest.json"
  info "manifesto atualizado para a versão ${publicada}"
fi

if [[ "${CONFERIR}" == "1" ]]; then
  echo "publish-portal: modo conferência — nada foi enviado. Conteúdo preparado:"
  (cd "${PORTAL_DIR}" && find . -type f -not -path './.vercel/*' -not -name '.env*' | sort | sed 's/^/    /')
  exit 0
fi

# ── Publicação ───────────────────────────────────────────────────────────────
info "publicando na Vercel (${VERCEL_SCOPE}/${VERCEL_PROJECT})"
(cd "${PORTAL_DIR}" && npx --yes vercel deploy --prod --yes --scope "${VERCEL_SCOPE}" >/dev/null) \
  || die "o deploy na Vercel falhou"

# ── Conferência do que ficou no ar ───────────────────────────────────────────
echo "publish-portal: conferindo o que ficou no ar"
falhas=0
verificar() { # url, descrição
  local codigo
  codigo="$(curl -s -o /dev/null -w '%{http_code}' --max-time 25 "$1" || echo 000)"
  if [[ "${codigo}" == "200" ]]; then
    info "✓ $2"
  else
    printf '  ✗ %s (HTTP %s)\n' "$2" "${codigo}" >&2
    falhas=$((falhas + 1))
  fi
}
verificar "${PORTAL_URL}/" "página de instalação"
verificar "${PORTAL_URL}/tenants.json" "catálogo de empresas"

if [[ "${SOMENTE_CATALOGO}" == "0" ]]; then
  verificar "${PORTAL_URL}/updates/latest.json" "manifesto de atualização"
  no_ar="$(curl -s --max-time 25 "${PORTAL_URL}/updates/latest.json" | jq -r '.version' 2>/dev/null || echo '')"
  [[ "${no_ar#v}" == "${VERSION}" ]] \
    || die "o manifesto no ar diz '${no_ar}', esperado ${VERSION}"
  info "✓ versão no ar confere: ${no_ar}"

  # O download é o que o cliente clica: confira que o redirecionamento chega ao
  # arquivo, e não apenas que responde.
  while read -r arquivo; do
    destino="$(curl -s -o /dev/null -w '%{http_code}' -L --max-time 60 "${PORTAL_URL}/downloads/${arquivo}" || echo 000)"
    if [[ "${destino}" == "200" ]]; then
      info "✓ download de ${arquivo}"
    else
      printf '  ✗ download de %s (HTTP %s)\n' "${arquivo}" "${destino}" >&2
      falhas=$((falhas + 1))
    fi
  done < <(jq -r '.platforms[].url | split("/") | last' "${PORTAL_DIR}/updates/latest.json" | sort -u)
fi

[[ "${falhas}" -eq 0 ]] || die "${falhas} endereço(s) não responderam; o portal está incompleto"
echo "publish-portal: portal publicado em ${PORTAL_URL}"
