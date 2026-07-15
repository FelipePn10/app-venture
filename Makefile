SHELL := /usr/bin/env bash

.PHONY: release release-check

release-check:
	@test -n "$(VERSION)" || (echo "uso: make release-check VERSION=1.0.0" >&2; exit 2)
	RELEASE_DRY_RUN=1 ./scripts/release.sh "$(VERSION)"

release:
	@test -n "$(VERSION)" || (echo "uso: make release VERSION=1.0.0" >&2; exit 2)
	./scripts/release.sh "$(VERSION)"
