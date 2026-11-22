# 📊 Projekt Fejlesztési Állapot és Lépésről-Lépésre Útiterv (Project Roadmap & Progress)

> **Cél:** Ez a dokumentum nyilvántartja a projekt aktuális készültségi szintjét, az elvégzett és a hátralévő mikrolépéseket. Bármikor, amikor egy új munkamenet indul, ebből a dokumentumból azonnal látható, hogy **hol tartunk és pontosan mi a következő teendő**.

---

## 📍 Aktuális Állapot Összegzés (Quick Status)

- **Legutóbb befejezett fázis:** **7. FÁZIS: FEEDERMATE SMART COMPANION OKOSESZKÖZ (ST7789 320x240 SZÍNES KIJELZŐ, 4 FIZIKAI GOMB, PONTOS IDŐ RTC & GYORS HALFOGÁS RÖGZÍTŐ VARÁZSLÓ)** ✅
- **Aktuális állapot:** Minden funkció (Kettős Motor + Xtensa Emulátor + WebSerial Flasher + Kapcsolási Rajz + FeederMate v3.8 Smart Companion rendszer 4 gombbal, stopwatch-csal, élő órával, súlypresetekkel és haltartó szákkezeléssel) hibátlanul működik és tesztelt (`npx tsc --noEmit` exit 0).

---

## 🗺️ Részletes Lépések Állapota (Checklist)

### 📁 1. FÁZIS: ALKALMAZÁS KERET & PROJEKTKEZELŐ RENDSZER (IDE Shell)
- [x] **1.1 Lépés: Projektkezelő Adatmodell & Sablonok & Exportáló** (`src/types/esp32.ts`, `defaultProjects.ts`, `projectManager.ts`, `exporter.ts`) ✅
- [x] **1.2 Lépés: Felső Vezérlősáv UI** (`src/components/TopBar.tsx`) ✅
- [x] **1.3 Lépés: Project Explorer Fájlfa & Áramkör Kezelő** (`src/components/ProjectSidebar.tsx`, `CircuitModal.tsx`) ✅
- [x] **1.4 Lépés: Monaco Multi-Tab Kódszerkesztő** (`src/components/EditorView.tsx`) ✅
- [x] **1.5 Lépés: Alsó Dokkoló Panel (Soros Monitor, Rendszer & Debug Logger, Oszcilloszkóp, WiFi/BLE, Lábkiosztás, Xtensa CPU)** (`src/components/BottomDock.tsx`) ✅
- [x] **1.6 Lépés: Vizuális Periféria Műszerfal & Fő Keret** (`src/App.tsx`, `RotaryEncoderView.tsx`, `BMP280View.tsx`, `OLEDDisplayView.tsx`, `ButtonView.tsx`, `BoardView.tsx`) ✅

---

### ⚙️ 2. FÁZIS: VIRTUÁLIS MOTOR & HARDVER EMULÁCIÓ
- [x] **2.1 Lépés: GPIO Manager & Megszakítás Motor (`src/core/gpioManager.ts`)** (40 láb, ADC, PWM, attachInterrupt) ✅
- [x] **2.2 Lépés: Virtuális I2C Busz (`src/core/i2cBus.ts`)** (Master/Slave kétvezetékes kommunikáció) ✅
- [x] **2.3 Lépés: KY-040 Kvadratúra Gray-Kód Generátor (`src/core/devices/rotaryEncoder.ts`)** ✅
- [x] **2.4 Lépés: Bosch BMP280 Regiszter Emuláció (`src/core/devices/bmp280.ts`)** ✅
- [x] **2.5 Lépés: SSD1306 1024-bájtos Framebuffer & Grafika (`src/core/devices/ssd1306.ts`)** ✅
- [x] **2.6 Lépés: ST7789 320x240 Színes IPS Kijelző Emuláció (`src/core/devices/st7789.ts`)** ✅
- [x] **2.7 Lépés: Virtuális Wi-Fi WebServer & BLE GATT (`src/core/virtualWifi.ts`, `virtualBle.ts`)** ✅
- [x] **2.8 Lépés: Arduino API Kompatibilitási Réteg & VM (`src/core/esp32Engine.ts`)** ✅

---

### 🧪 3. FÁZIS: BEKÖTÉS, INTEGRÁCIÓ & E2E RENDSZERTESZT
- [x] **3.1 Lépés: UI Widgetek összekötése a Virtuális Motorral** (`src/App.tsx` élő kapcsolatok) ✅
- [x] **3.2 Lépés: Időjárásállomás & Rotary Menü Teljes Folyamatteszt** ✅
- [x] **3.3 Lépés: Strukturált Rendszer- és Hibakereső Naplózó (Logger Subsystem)** (`src/utils/logger.ts`) ✅
- [x] **3.4 Lépés: Valós Exportálás Ellenőrzése (Arduino IDE & PlatformIO zip/fájlok)** (`src/project/exporter.ts`) ✅

---

### 🧠 4. FÁZIS: BEÉPÍTETT XTENSA LX6 CPU & MMIO EMULÁTOR (Zero-Install Low-Level Engine)
- [x] **4.1 Lépés: Xtensa LX6 Utasításkészlet Emulátor (`src/core/xtensaCpu.ts`)** (PC, A0-A15, SAR, PS, CCOUNT, L32I, S32I, ADD, SUB, BNE, J, MMIO 0x3FF44000) ✅
- [x] **4.2 Lépés: Disassembly & Regiszter Felügyelő UI (`src/components/CpuRegisterInspector.tsx`)** (Élő léptetés, futtatás, memóriacím hex néző, DRAM/IRAM tartományok) ✅
- [x] **4.3 Lépés: Dokkoló Integráció** (Xtensa LX6 Core fül hozzáadása az alsó sávhoz) ✅

---

### 🔌 5. FÁZIS: VALÓS HARDVER FLASHER & WEBSERIAL KAPCSOLAT
- [x] **5.1 Lépés: Web Serial API Integráció (`src/core/hardwareSerial.ts`)** (Automatikus csatlakoztatás / lecsatlakoztatás figyelése, USB Chip felismerés: CP2102, CH340, FTDI, Espressif CDC) ✅
- [x] **5.2 Lépés: In-Browser esptool-js Flasher Modal (`src/components/HardwareSerialModal.tsx`)** (Bináris firmware feltöltés 0x10000 / 0x0 címekre, 115200..921600 baud ráta, valós idejű progress bar és log) ✅
- [x] **5.3 Lépés: Élő Hardver Soros Monitor & Reset** (Valós eszköz kimenetének olvasása, DTR/RTS hardveres újraindítás) ✅
- [x] **5.4 Lépés: 1-Kattintásos Letölthető Projekt Csomagok** (Arduino IDE és PlatformIO készre csomagolt `.zip` archívumok letöltése bekötési segédlettel) ✅

---

### 📐 6. FÁZIS: VEKTOROS KAPCSOLÁSI RAJZ & INTERAKTÍV HUZALOZÁS (Schematic Studio)
- [x] **6.1 Lépés: Pixel-Pontos SVG Rajzvászon (`src/components/CircuitCanvasView.tsx`)** (1260x740px térkép, ESP32 + OLED + ST7789 + BMP280 + Rotary + LED modulok) ✅
- [x] **6.2 Lépés: Egyedi Lábkiosztás & Színkódolt Vezetékek** (Minden GPIO láb saját dedikált színnel rendelkezik) ✅
- [x] **6.3 Lépés: Interaktív Net Kiemelés & Láblista** (Görgethető "Bekötött Lábak" sáv az alsó részen, egérrel rámutatva az adott vezeték felvillan/kiemelődik) ✅

---

### 🎣 7. FÁZIS: FEEDERMATE SMART COMPANION v3.8 (Catch Manager & Okoseszköz Rendszer)
- [x] **7.1 Lépés: Moduláris C++ Architektúra** (`main.ino`, `config.h`, `app_state.h/cpp`, `stopwatch.h/cpp`, `catch_manager.h/cpp`, `input_manager.h/cpp`, `display_ui.h/cpp`) ✅
- [x] **7.2 Lépés: Dedikált Catch Manager Modul (`catch_manager.h / .cpp`)**:
  - Súly presetek listája (`0.20, 0.50, 1.00, 1.50, 2.00, 3.00, 4.00, 5.00 kg`)
  - Haltartó szákok és kapacitás limitek (`1. Szák (20 kg)` vs `2. Szák (25 kg)`)
  - `startCatchWizard()`, `nextWeightPreset()`, `prevWeightPreset()`, `nextKeepnet()`, `prevKeepnet()`, `recordCurrentCatch()` üzleti logika és állapotmodell ✅
- [x] **7.3 Lépés: 4 Fizikai Nyomógomb Kezelés & Hardver Megszakítások (ISR)**:
  - `GPIO 14`: 1. Gomb (HOME - 1 kattintásos visszatérés a Dashboardra)
  - `GPIO 27`: 2. Gomb (DOBÁS / STOPWATCH - Start / Stop & Reset toggle, 30 mp célidő)
  - `GPIO 32`: 3. Gomb (BACK - Visszalépés / Mégse)
  - `GPIO 33`: 4. Gomb (HALFOGÁS - Stopwatch auto-reset és Catch Manager varázsló indítása) ✅
- [x] **7.4 Lépés: ST7789 320x240 Dashboard Élő Órával & Keret-Folyamatjelzővel**:
  - Fejléc Közép RTC Badge: `HH:MM`
  - Nagy Digitális Számláló (Size 6, 48px)
  - 3px-es Körbefutó Keret-Folyamatjelző csík (Perimeter Progress)
  - Kártya alsó sor: `IDŐ: HH:MM:SS | FOGÁS: X db (Y.YY kg)` élő másodperces frissítéssel ✅
- [x] **7.5 Lépés: 2-Lépcsős Halfogás Rögzítő Varázsló (Catch Wizard Flow)**:
  - **1. Lépés (`SCREEN_CATCH_WEIGHT`):** Választás a súlypresetek között a Rotaryval, jóváhagyás Rotary gombbal
  - **2. Lépés (`SCREEN_CATCH_KEEPNET`):** Haltartó Szák választás, új összsúly élő kalkulációval, mentés Rotary gombbal
  - **Fogás Mentése:** Összsúly, fogásszám és száktelítettség növelése, LED villanás, automatikus visszatérés a Dashboardra ✅
- [x] **7.6 Lépés: C++ Transpiler és Engine Támogatás** (`sprintf`, `formatPrintf`, változódeklarációk, struct kezelés és ütközésmentes RTC injektálás) ✅




