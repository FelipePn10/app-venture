#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-}"
TAG="v${VERSION}"
DRY_RUN="${RELEASE_DRY_RUN:-0}"
fail() { printf 'desktop release: %s\n' "$*" >&2; exit 1; }

[[ "${VERSION}" =~ ^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?$ ]] || fail "VERSION deve ser SemVer sem v"
[[ "$(git branch --show-current)" == "main" ]] || fail "release só pode ser criado na main"
[[ -z "$(git status --porcelain)" ]] || fail "worktree deve estar limpo"
git fetch --tags origin
git rev-parse --verify "refs/tags/${TAG}" >/dev/null 2>&1 && fail "tag já existe"
git ls-remote --exit-code --tags origin "refs/tags/${TAG}" >/dev/null 2>&1 && fail "tag já existe no origin"

npm ci
npm run test:versioning
npm run lint
npm run build:production
(cd src-tauri && cargo test --locked)

if [[ "${DRY_RUN}" == "1" ]]; then
  printf 'desktop release: validação concluída sem alterações\n'
  exit 0
fi

node scripts/set-release-version.mjs "${VERSION}"
npm run test:versioning

DATE="$(date -u +%Y-%m-%d)"
TMP="$(mktemp)"
trap 'rm -f "${TMP}"' EXIT
awk -v tag="${TAG}" -v date="${DATE}" '/^## Unreleased$/ && !done { print $0 "\n\n## [" tag "] — " date; done=1; next } { print }' CHANGELOG.md >"${TMP}"
mv "${TMP}" CHANGELOG.md
trap - EXIT
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json CHANGELOG.md
git commit -m "chore(release): ${TAG}"
git tag -a "${TAG}" -m "ERP Venture ${TAG}"
git push --atomic origin main "${TAG}"
