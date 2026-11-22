#!/usr/bin/env bash
# ==============================================================================
# ESP32 Simulator - Asztali Telepítő Csomagoló Szkript (macOS / Windows / Linux)
# ==============================================================================

set -e
cd "$(dirname "$0")/.."

echo "📦 [ESP32 Simulator] Asztali alkalmazás csomagolása (Electron Builder)..."

# Először lefordítjuk
./scripts/build.sh

# Csomagolás a kiválasztott platformra
PLATFORM="${1:-current}"

case "$PLATFORM" in
    mac)
        echo "🍎 macOS (.dmg / .app) csomagolás..."
        npx electron-builder --mac
        ;;
    win)
        echo "🪟 Windows (.exe / NSIS telepítő) csomagolás..."
        npx electron-builder --win
        ;;
    linux)
        echo "🐧 Linux (.AppImage / .deb) csomagolás..."
        npx electron-builder --linux
        ;;
    *)
        echo "💻 Aktuális operációs rendszerre való csomagolás..."
        npx electron-builder
        ;;
esac

echo "🎉 [KÉSZ] A telepítőcsomagok a 'release/' mappában találhatók!"
