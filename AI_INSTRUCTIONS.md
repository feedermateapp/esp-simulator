# AI Kódoló Ágensek Alapelvei és Szabályai (AI Agent Instructions)

> **Cél:** Ez a fájl tartalmazza az összes olyan kötelező érvényű szabályt, architektúrális megkötést, hardveres konvenciót és kódolási irányelvet, amelyet minden ebben a repóban dolgozó AI ágensnek (és fejlesztőnek) automatikusan követnie kell, anélkül, hogy a felhasználónak ezeket minden egyes promptban meg kellene ismételnie.

---

## 🏛️ 1. Architektúrális Alapszabályok (Nem Áthágható)

1. **Szigorú réteg-szétválasztás (Separation of Concerns):**
   - `src/core/`: **Tiszta TypeScript szimulációs logika.** Itt TILOS React hookokat (`useState`, `useEffect`), DOM elemeket vagy közvetlen UI hivatkozásokat használni. A szimulációs motornak és a periféria emulátoroknak önmagukban, headless módban és Web Workerben is működőképesnek kell lenniük.
   - `src/components/`: **Prezentációs réteg (React 19 + Tailwind).** Csak a megjelenítésért, a felhasználói interakcióért és az állapotok kirajzolásáért felel. Eseményeken (`onPinChange`, `onStateChange`) keresztül kommunikál a `src/core/` réteggel.
   - `src/project/`: **Projektkezelő alrendszer.** Fájlrendszer műveletek, `circuit.json` szerkesztése, importálás és exportálás (Arduino IDE / PlatformIO).
   - `src/types/`: **Közös típusok.** Minden típusváltoztatást itt kell kezdeni (`src/types/esp32.ts`).

2. **Nem-blokkoló aszinkron végrehajtás:**
   - A virtuális `delay()` és a szimuláció főciklusa (`loop()`) **soha nem fagyaszthatja le a React / Electron UI-t**. Mindig Promise-alapú aszinkron ütemezést és mikro-tick megszakíthatóságot kell alkalmazni.

3. **Szigorú Típusosság (Strict TypeScript):**
   - Tilos az indokolatlan `any` használata. Minden GPIO állapot, I2C regiszter, megszakítás, projekt fájl és hálózati csomag szigorúan típusos.
   - Bármilyen kódmódosítás után kötelező ellenőrizni a fordítást: `npx tsc --noEmit`.

---

## 🔌 2. Hardveres Konvenciók és Alapértelmezett Lábkiosztás

Amikor egy új funkciót vagy példakódot írsz, **mindig az alábbi fix lábkiosztást és címeket használd**:

| Hardver Elem | Láb / Cím | ESP32 GPIO | Viselkedési Követelmény |
| :--- | :--- | :--- | :--- |
| **I2C SDA** | Data | **GPIO 21** | Kétvezetékes I2C adatvonal |
| **I2C SCL** | Clock | **GPIO 22** | Kétvezetékes I2C órajel |
| **SSD1306 OLED** | I2C Addr: **`0x3C`** | GPIO 21 / 22 | 128x64 felbontás, 1024 bájtos GDDRAM framebuffer |
| **BMP280 / BME280**| I2C Addr: **`0x76`** | GPIO 21 / 22 | Chip ID `0x58` / `0x60`, valós kompenzációs képletek |
| **Rotary CLK (A)**| Phase A | **GPIO 18** | Interrupt képes (RISING / FALLING) |
| **Rotary DT (B)** | Phase B | **GPIO 19** | Iránydetektálás a CLK élénél |
| **Rotary SW** | Push Button | **GPIO 23** | `INPUT_PULLUP` logika (Alapban HIGH, lenyomva LOW) |
| **Gomb A / B** | Extra Buttons | **GPIO 4 / 5** | `INPUT_PULLUP` logika |
| **Beépített LED** | Status LED | **GPIO 2** | HIGH = Világít, LOW = Sötét, PWM kitöltés támogatás |

### Rotary Encoder Kvadratúra Szabály
A KY-040 emulátornak tekeréskor **mind a 4 fázisú Gray-kód lépést** generálnia kell:
- **CW (Jobbra):** `[1,1] -> [0,1] -> [0,0] -> [1,0] -> [1,1]`
- **CCW (Balra):** `[1,1] -> [1,0] -> [0,0] -> [0,1] -> [1,1]`
Ez biztosítja, hogy a felhasználó által írt valódi Arduino `attachInterrupt(18, isr, FALLING)` kód azonnal és pontosan működjön!

---

## 📁 3. Projektkezelési & Fájlkezelési Szabályok

1. **Projekt struktúra:** Minden projektnek kötelezően rendelkeznie kell egy `project.json` és egy `circuit.json` fájllal, valamint a forrásfájlokkal (`src/main.ino` vagy `src/main.cpp`).
2. **Áramköri szinkronizáció:** Ha a kódban módosul a lábkiosztás, a szimulátornak a `circuit.json` konfigurációt kell követnie.
3. **Export kompatibilitás:** A generált Arduino vázlatnak és PlatformIO projektnek hiba nélkül fordíthatónak kell lennie a valós fordítóeszközökkel is.

---

## 📶 4. Wi-Fi és Bluetooth Alszabályok

1. **Wi-Fi:** A `WiFi.begin()` meghívása szimulált IP-t rendel a mikrokontrollerhez. Ha a kód `server.begin()` hívással webszervert indít, a UI-ban a Virtuális Böngésző nézetnek automatikusan elérhetővé kell válnia.
2. **Bluetooth / BLE:** A `BLEDevice` vagy `BluetoothSerial` használatakor a szimulátor belső eseményt küld, amely a BLE Explorer és Bluetooth Terminál füleken azonnal megjeleníti az eszközt és a karakterisztikákat.

---

## 💡 5. Kódolási és Fejlesztési Irányelvek AI-nak

- **Fájlelnevezések:** camelCase a logika számára (`esp32Engine.ts`, `rotaryEncoder.ts`), PascalCase a React komponensek számára (`BoardView.tsx`, `RotaryEncoderView.tsx`).
- **Nyelvhasználat:**
  - A forráskódban a változónevek, függvénynevek és belső kommentek **angol nyelvűek** (nemzetközi open-source standard).
  - A felhasználói felület (UI feliratok) és a dokumentáció alapértelmezetten **magyar és angol barát** legyen.
- **Kis inkrementális lépések:** Ne írj át egyszerre több független alrendszert. Először hozd létre a típust / motort, teszteld a típusellenőrzést (`tsc`), majd építsd rá a UI komponenst.
- **Hibakezelés:** A felhasználói C++ / Arduino kód hibáit (végtelen ciklus, szintaxishiba, null pointer) védett `try/catch` blokkban kezeld, és küldj tiszta, emberi nyelven olvasható hibaüzenetet a Serial Monitorra (`SerialMessage` típus: `ERROR`).

---

## 🧪 6. Granuláris & Önállóan Tesztelhető Lépések Szabálya (TDD)

Minden feladatot és mérföldkövet **kis, önmagában tesztelhető lépésekre (Micro-steps)** kell bontani:
1. **Egy lépés = Egyetlen zárt felelősség.**
2. **Kötelező önálló teszt (Self-Verification):** Minden lépés megírásakor azonnal ellenőrizni kell az adott modul helyes működését (pl. izolált egységteszttel vagy tesztszkripttel), még mielőtt rákötnénk a következő modult.
3. **Pass/Fail kritérium:** A következő lépésre csak akkor lehet továbblépni, ha az aktuális lépés tesztje 100%-ban sikeres és a TypeScript fordítás hiba nélkül lefut (`npx tsc --noEmit`).

---

## 📊 7. Haladáskövetés és Javaslattétel (Progress Tracking)

Minden AI ágens köteles a `docs/PROJECT_ROADMAP_PROGRESS.md` fájlt naprakészen tartani:
1. Amikor egy mikrolépés elkészül és verifikálva van, jelöld be a checkboxot `[x]`-re a roadmap fájlban.
2. A felhasználó felé tett válaszokban mindig jelenítsd meg:
   - **Hol tartunk most** (Legutóbb befejezett mikrolépés).
   - **Mi a következő konkrét lépés** (Next recommended step), amit egyértelműen javasolsz a folytatáshoz.
