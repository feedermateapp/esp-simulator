# ESP32 Desktop Hardware Simulator & IDE

Egy modern, asztali (desktop) **ESP32 mikrokontroller, áramköri szimulátor és fejlesztői környezet**, amelyet **Electron + React + TypeScript + Tailwind CSS** technológiákkal építünk.

A szimulátor célja, hogy teljes értékű, vizuális és interaktív tesztkörnyezetet biztosítson fizikai hardver nélkül, beépített **Projektkezeléssel**, **Wi-Fi / WebServer**, **Bluetooth / BLE** és dedikált periféria emulációval (KY-040 Rotary Encoder, BMP280 Barométer, SSD1306 OLED kijelző).

---

## 🚀 Gyors Indítás és Build Scriptek

A projekt egyszerűen futtatható és fordítható az alábbi **egy-kattintásos scriptekkel** vagy a **Makefile** segítségével:

### 0. Első telepítés (friss klón után)
```bash
# Minden: npm függőségek + arduino-cli (tools/) + ESP32 core + Arduino libek + ellenőrző fordítás
./scripts/setup.sh
# vagy:
make setup

# Csak a szimulátor (firmware toolchain nélkül):
./scripts/setup.sh --no-firmware
# vagy:
make setup-web
```

### 1. Futtatás fejlesztői módban (Dev)
```bash
# Asztali Electron alkalmazás indítása fejlesztői módban:
./scripts/dev.sh
# vagy:
make dev

# Csak a webes felület indítása böngészőben (http://localhost:5173):
./scripts/dev.sh web
# vagy:
make dev-web
```

### 2. Teljes fordítás (Build)
```bash
# TypeScript ellenőrzés + Vite web build + Electron main process fordítás:
./scripts/build.sh
# vagy:
make build
```

### 3. Végleges Asztali Telepítő Csomagolása (Package)
```bash
# Csomagolás az aktuális platformra:
./scripts/package.sh
# vagy:
make package

# macOS (.dmg / .app) csomagolás:
./scripts/package.sh mac
# Windows (.exe) csomagolás:
./scripts/package.sh win
# Linux (.AppImage / .deb) csomagolás:
./scripts/package.sh linux
```

### 4. Tesztek és Tisztítás
```bash
# Típusellenőrzés és tesztek futtatása:
make test

# Generált build fájlok törlése:
make clean
```

---

## 🎯 Főbb Képességek & Hardver Támogatás

1. 📁 **Teljes Értékű Projektkezelő & Exportáló:**
   - Többfájlos projektek (`main.ino`, `config.h`, `display_menu.cpp`, `sensors.h`) fülkékkel a kódszerkesztőben.
   - Áramköri konfiguráció (`circuit.json`) a csatlakoztatott modulok és lábkiosztás testreszabásához.
   - Mentés, megnyitás, sablonválasztó és egy kattintásos **Arduino IDE (.zip)** / **PlatformIO (.zip)** letölthető csomagolás bekötési segédlettel.

2. 🧠 **Kettős Szimulációs Motor (Dual-Engine):**
   - **Magas Szintű C++ AST Transpiler & API VM:** Valós idejű, mikroszekundumos időzítésű virtuális ESP32 motor, mely natívan futtatja az Arduino C++ forráskódot külső fordítóprogram telepítése nélkül.
   - **Alacsony Szintű Xtensa LX6 CPU & MMIO Emulátor:** Beépített 32 bites utasításkészlet emuláció (`PC`, `A0-A15`, `SAR`, `PS`, `CCOUNT`, `L32I`, `S32I`, `ADD`, `SUB`, `BNE`, `J`), GPIO MMIO regiszterek (`0x3FF44000`), élő disassembly és hexdump memóriavizsgáló (DRAM/IRAM).

3. 🔌 **Web Serial Valós Hardver Csatlakozás & Firmware Flasher:**
   - Valós idejű eszközérzékelés (USB plug & play csatlakoztatás / lecsatlakoztatás figyelése a Web Serial API-n keresztül).
   - Automatikus USB illesztő felismerés: **Silicon Labs CP2102**, **WCH CH340**, **FTDI FT232**, **Espressif USB-JTAG/CDC**.
   - Beépített böngészős firmware feltöltő (**`esptool-js`**) bináris `.bin` fájlok flasheléséhez (`0x10000` / `0x0`), 115200 / 460800 / 921600 baud sebességgel és DTR/RTS hardveres újraindítással.

4. 📐 **Vektoros Kapcsolási Rajz & Interaktív Huzalozási Stúdió:**
   - Nagyfelbontású ($1260 \times 740\text{px}$) pixel-pontos SVG áramköri rajz.
   - Egyedi, ütközésmentes lábkiosztás és minden GPIO-hoz dedikált színkódolt vezeték.
   - Interaktív huzalozási hálózat kiemelés: az egérrel rámutatva a vezetékre vagy a lábra, a teljes elektromos hálózat felvillan és megkülönböztetésre kerül.
   - Alsó vízszintes, görgethető "Bekötött Lábak" információs sáv.

5. 🎛️ **KY-040 Rotary Encoder Kvadratúra Emuláció:**
   - Valós Gray-kód fáziseltolásos impulzusok generálása (`CLK` 18, `DT` 19).
   - Hardveres megszakítások (`attachInterrupt`) valósághű kiváltása és beépített nyomógomb (`SW` 23).

6. 🌡️ **Bosch BMP280 / BME280 Barométer & Hőmérsékletszenzor:**
   - I2C regisztertérkép (`0x76` / `0x77`, `0xD0`, `0xF4`, `0xF7..0xFC`, `0x88..0xA1`).
   - Valós idejű kompenzációs számítás és tengerszint feletti magasság mérés (SDA 25, SCL 26).

7. 🖥️ **SSD1306 128x64 I2C OLED Kijelző:**
   - 1024 bájtos belső GDDRAM framebuffer, grafikus alakzatok, vonalak, körök, 5x7 és 8x8 fontok (SDA 21, SCL 22).

8. 📶 **Virtuális Wi-Fi & WebServer:**
   - STA és SoftAP mód (`WiFi.begin`, `WiFi.softAP`).
   - Beépített **Virtuális Web Browser Tab**, amellyel a szimulált ESP32 által kiszolgált weboldalak megtekinthetők és kattinthatók.
   - MQTT kliens (`PubSubClient`) üzenetnaplóval.

9. 📱 **Bluetooth Classic & BLE (Bluetooth Low Energy):**
   - `BluetoothSerial` vezeték nélküli terminál.
   - BLE GATT Szerver és **BLE Explorer Panel** élő szenzorértesítések (`NOTIFY`) fogadására.

10. 📟 **Soros Monitor & Logikai Analizátor (Waveform):**
    - Kétirányú soros terminál időbélyegekkel, valamint GPIO oszcilloszkóp a jelek vizsgálatára.

---

## 🧭 Részletes Fejlesztői & AI Dokumentáció

- 📊 **[docs/PROJECT_ROADMAP_PROGRESS.md](docs/PROJECT_ROADMAP_PROGRESS.md)**: **Élő haladáskövető és útmutató.**
- 🤖 **[AI_INSTRUCTIONS.md](AI_INSTRUCTIONS.md)**: Kötelező kódolási és architektúra szabályok AI ágenseknek.
- 📐 **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Rendszerterv, IPC réteg, modulok kapcsolatai.
- 🔌 **[docs/HARDWARE_SPECIFICATIONS.md](docs/HARDWARE_SPECIFICATIONS.md)**: Lábkiosztási mátrix, Gray-kód átmenetek, I2C regiszterek.
- 📶 **[docs/WIFI_BLUETOOTH_SPEC.md](docs/WIFI_BLUETOOTH_SPEC.md)**: Wi-Fi, WebServer, MQTT és BLE specifikáció.
- 📁 **[docs/PROJECT_MANAGEMENT_SPEC.md](docs/PROJECT_MANAGEMENT_SPEC.md)**: Projektstruktúra, `circuit.json`, exportálási formátumok.
- ⚙️ **[docs/SIMULATOR_ENGINE_SPEC.md](docs/SIMULATOR_ENGINE_SPEC.md)**: Arduino API kompatibilitás, életciklus, megszakítások.
- 📋 **[docs/AI_DEVELOPMENT_GUIDE.md](docs/AI_DEVELOPMENT_GUIDE.md)**: Lépésről-lépésre mérföldkövek és tesztelési ellenőrzőlisták.
