#!/usr/bin/env bash
# ==============================================================================
# ESP32 Simulator - Egykattintásos Fejlesztői Futtató Szkript
# ==============================================================================

set -e
cd "$(dirname "$0")/.."

echo "⚡ [ESP32 Simulator] Fejlesztői környezet ellenőrzése..."

if ! command -v node &> /dev/null; then
    echo "❌ Hiba: A Node.js nincs telepítve a rendszeren!"
    exit 1
fi

echo "📦 Node.js verzió: $(node -v)"
echo "📦 NPM verzió: $(npm -v)"

# Függőségek ellenőrzése
if [ ! -d "node_modules" ]; then
    echo "📥 Függőségek telepítése (npm install)..."
    npm install
fi

# Futtatási mód választása: Electron asztali vagy Webes böngésző
MODE="${1:-electron}"

if [ "$MODE" = "web" ]; then
    echo "🌐 Webes felület indítása böngészőben (http://localhost:5173)..."
    npm run dev
else
    echo "🚀 Electron asztali alkalmazás indítása fejlesztői módban..."
    npm run electron:dev
fi
