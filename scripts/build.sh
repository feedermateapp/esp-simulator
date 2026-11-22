#!/usr/bin/env bash
# ==============================================================================
# ESP32 Simulator - Teljes Projekt Fordító Szkript
# ==============================================================================

set -e
cd "$(dirname "$0")/.."

echo "🔨 [ESP32 Simulator] Projekt fordítása folyamatban..."

# 1. Korábbi build törlése
echo "🧹 Tisztítás (dist és dist-electron)..."
rm -rf dist dist-electron

# 2. Típusellenőrzés
echo "🔍 TypeScript típusellenőrzés..."
npm run lint

# 3. Web UI fordítása (Vite)
echo "⚡ Web UI csomagolása (Vite build)..."
npx vite build

# 4. Electron főfolyamat fordítása
echo "🖥️ Electron main process fordítása (TypeScript)..."
npx tsc -p tsconfig.electron.json

echo "✅ [SIKERES FORDÍTÁS] A build készen áll a 'dist/' és 'dist-electron/' mappákban!"
