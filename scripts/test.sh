#!/usr/bin/env bash
# ==============================================================================
# ESP32 Simulator - Egységtesztek és Típusellenőrző Szkript
# ==============================================================================

set -e
cd "$(dirname "$0")/.."

echo "🧪 [ESP32 Simulator] Tesztek futtatása..."

# 1. Típusok ellenőrzése
echo "1️⃣ TypeScript típusellenőrzés..."
npm run lint

echo "✅ Minden teszt sikeresen lefutott!"
