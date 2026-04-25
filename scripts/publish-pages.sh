#!/usr/bin/env bash
# Rebuilds apps/demo and force-pushes the result to the gh-pages branch.
# Use this when apps/demo source changes and you don't want to wait on
# the GitHub Actions Pages workflow.
#
# Requires: pnpm + node + git + clean working tree.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

if ! git diff-index --quiet HEAD --; then
  echo "ERROR: working tree has uncommitted changes. Commit or stash first." >&2
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TMP_DIR="$(mktemp -d)"
BASE_PATH="${NEXT_PUBLIC_BASE_PATH:-/GRX-Platform}"

echo "==> Installing demo dependencies"
(cd apps/demo && pnpm install --frozen-lockfile)

echo "==> Building static export with basePath='${BASE_PATH}'"
(cd apps/demo && NEXT_PUBLIC_BASE_PATH="$BASE_PATH" pnpm build)

cp -a apps/demo/out/. "$TMP_DIR/"
touch "$TMP_DIR/.nojekyll"

echo "==> Refreshing gh-pages branch"
git fetch origin gh-pages || true
git checkout --orphan gh-pages-tmp
git rm -rf . >/dev/null
cp -a "$TMP_DIR/." .

git add -A
git -c user.name="GRX Pages Bot" -c user.email="pages@grx.local" \
  commit -m "Static demo build $(date -u +%Y-%m-%dT%H:%M:%SZ)"

git branch -D gh-pages 2>/dev/null || true
git branch -m gh-pages
git push --force origin gh-pages

git checkout "$CURRENT_BRANCH"
rm -rf "$TMP_DIR"
echo
echo "Published. URL: https://<owner>.github.io${BASE_PATH}/"
