#!/bin/sh
# tools/validate.sh — Portão único: só passa se TUDO passar. Rode antes de cada git save.
# Uso: sh tools/validate.sh
set -e
cd "$(dirname "$0")/.."
echo "== V1 node --check =="
for f in src/core/*.js src/systems/*.js src/maps/*.js src/data/*.js src/main.js tools/*.js; do
  node --check "$f" || exit 1
done
echo "V1 PASS"
echo "== V2 build (orçamento 250KB) =="
node tools/build.js --check-size || exit 1
echo "== V3 smoke =="
node tools/smoke.js || exit 1
echo "== V4 auditoria severa =="
node tools/audit.js || exit 1
echo "VALIDATE PASS — liberado para git save."
