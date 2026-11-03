#!/bin/sh
# Genera la página de comparación de maniquís en un solo archivo HTML.
set -e
cd "$(dirname "$0")/.."
npx esbuild tools/compare.ts --bundle --format=iife --minify --loader:.json=json --outfile=/tmp/compare.js --log-level=warning
OUT=${1:-tools/comparativa-maniquis.html}
{ cat tools/compare.shell.html; printf '\n<script>\n'; cat /tmp/compare.js; printf '\n</script>\n'; } > "$OUT"
echo "$OUT $(du -k "$OUT" | cut -f1) KB"
