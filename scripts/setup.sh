#!/usr/bin/env bash
# ==============================================================================
# ESP32 Simulator - Lokális környezet összerakása friss klón után
#
# Használat:
#   ./scripts/setup.sh                 # minden: npm + arduino-cli + ESP32 core + libek
#   ./scripts/setup.sh --no-firmware   # csak a szimulátor (npm függőségek)
#
# Idempotens: többször futtatható, ami már megvan, azt átugorja.
# ==============================================================================

set -euo pipefail
cd "$(dirname "$0")/.."

# --- Rögzített verziók (ezekkel működik a firmware/feedermate_step1) ---------
ARDUINO_CLI_VERSION="1.5.1"
ESP32_CORE="esp32:esp32@3.3.12"
ESP32_INDEX_URL="https://espressif.github.io/arduino-esp32/package_esp32_index.json"
# Minden függőség explicit + --no-deps, különben a lib manager a legújabbra húzza őket.
ARDUINO_LIBS=(
    "Adafruit GFX Library@1.12.6"
    "Adafruit ST7735 and ST7789 Library@1.11.0"
    "Adafruit BusIO@1.17.4"
    "Adafruit seesaw Library@1.7.9"
    "SD@1.3.0"
)
MIN_NODE_MAJOR=20

CLI="./tools/arduino-cli"
WITH_FIRMWARE=1

for arg in "$@"; do
    case "$arg" in
        --no-firmware) WITH_FIRMWARE=0 ;;
        -h|--help)
            sed -n '2,10p' "$0"; exit 0 ;;
        *) echo "❌ Ismeretlen kapcsoló: $arg"; exit 1 ;;
    esac
done

step() { echo; echo "▶ $*"; }

# --- 1. Node.js + npm függőségek ---------------------------------------------
step "Node.js ellenőrzése"
if ! command -v node &> /dev/null; then
    echo "❌ A Node.js nincs telepítve (min. v${MIN_NODE_MAJOR}). Pl.: brew install node"
    exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ]; then
    echo "❌ Node.js $(node -v) túl régi, min. v${MIN_NODE_MAJOR} kell."
    exit 1
fi
echo "✅ Node.js $(node -v), npm $(npm -v)"

step "npm függőségek telepítése (npm ci)"
npm ci
echo "✅ node_modules kész"

if [ "$WITH_FIRMWARE" -eq 0 ]; then
    echo; echo "🎉 Kész (firmware toolchain kihagyva). Indítás: make dev"
    exit 0
fi

# --- 2. arduino-cli letöltése a tools/ mappába -------------------------------
step "arduino-cli ${ARDUINO_CLI_VERSION} ellenőrzése"
if [ -x "$CLI" ] && "$CLI" version 2>/dev/null | grep -q "Version: ${ARDUINO_CLI_VERSION}"; then
    echo "✅ Már telepítve: $CLI"
else
    case "$(uname -s)-$(uname -m)" in
        Darwin-arm64)               PLATFORM="macOS_ARM64" ;;
        Darwin-x86_64)              PLATFORM="macOS_64bit" ;;
        Linux-x86_64)               PLATFORM="Linux_64bit" ;;
        Linux-aarch64|Linux-arm64)  PLATFORM="Linux_ARM64" ;;
        *) echo "❌ Nem támogatott platform: $(uname -s)-$(uname -m)"; exit 1 ;;
    esac
    URL="https://downloads.arduino.cc/arduino-cli/arduino-cli_${ARDUINO_CLI_VERSION}_${PLATFORM}.tar.gz"
    TMP="$(mktemp -d)"
    trap 'rm -rf "$TMP"' EXIT
    echo "📥 Letöltés: $URL"
    curl -fsSL "$URL" -o "$TMP/cli.tar.gz"
    tar -xzf "$TMP/cli.tar.gz" -C "$TMP" arduino-cli
    mkdir -p tools
    mv "$TMP/arduino-cli" "$CLI"
    chmod +x "$CLI"
    echo "✅ $("$CLI" version)"
fi

# --- 3. ESP32 board core -----------------------------------------------------
step "ESP32 core (${ESP32_CORE}) telepítése"
"$CLI" core update-index --additional-urls "$ESP32_INDEX_URL"
"$CLI" core install "$ESP32_CORE" --additional-urls "$ESP32_INDEX_URL"

# --- 4. Arduino könyvtárak ---------------------------------------------------
step "Arduino könyvtárak telepítése"
"$CLI" lib update-index
for lib in "${ARDUINO_LIBS[@]}"; do
    echo "📚 $lib"
    "$CLI" lib install --no-deps "$lib"
done

# --- 5. Ellenőrző fordítás ---------------------------------------------------
step "Ellenőrző firmware fordítás (feedermate_step1)"
"$CLI" compile --fqbn esp32:esp32:esp32 firmware/feedermate_step1

echo
echo "🎉 Kész! Következő lépések:"
echo "   make dev        # Electron szimulátor"
echo "   make dev-web    # böngészős felület (http://localhost:5173)"
echo "   $CLI board list # csatlakoztatott ESP32 keresése"
