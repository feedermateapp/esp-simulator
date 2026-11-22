# Projektkezelési Rendszer Specifikáció (Project Management Spec)

Ez a dokumentum részletezi a szimulátor **Projektkezelő Rendszerét**, amely lehetővé teszi több fájlból álló projektek létrehozását, mentését, megnyitását, áramköri konfigurációk (`wiring.json`) tárolását és exportálását valós Arduino IDE / PlatformIO környezetbe.

---

## 1. Projekt Adatstruktúra (`.espproj` / Mappa Struktúra)

Egy szimulátor projekt az alábbi felépítéssel rendelkezik:

```
my-weather-station/
├── project.json             # Projekt metaadatok, célhardver és beállítások
├── circuit.json             # Csatlakoztatott perifériák és lábkiosztás
├── src/
│   ├── main.ino             # Fő Arduino / C++ vázlat (setup, loop)
│   ├── config.h             # Pin definíciók és konstansok
│   ├── display_menu.cpp     # OLED menü megjelenítő modul
│   └── sensor_reader.cpp    # BMP280 és rotary kezelő kód
└── assets/                  # Képek, egyedi fontok, bittérképek (opcionális)
```

### `project.json` formátum
```json
{
  "id": "proj_weather_station_01",
  "name": "ESP32 Weather Station & Rotary Menu",
  "description": "Időjárás állomás BMP280 szenzorral, SSD1306 OLED kijelzővel és forgó jeladós menüvel",
  "version": "1.0.0",
  "author": "Felhasználó",
  "targetBoard": "ESP32_DEVKIT_V1",
  "createdAt": 1741700000000,
  "updatedAt": 1741700500000,
  "mainFile": "src/main.ino"
}
```

### `circuit.json` formátum (Áramköri konfiguráció)
```json
{
  "board": "ESP32_DEVKIT_V1",
  "peripherals": [
    {
      "id": "oled_01",
      "type": "SSD1306_OLED",
      "name": "Fő Kijelző (128x64)",
      "pins": {
        "sda": 21,
        "scl": 22
      },
      "config": {
        "i2cAddress": "0x3C",
        "width": 128,
        "height": 64
      }
    },
    {
      "id": "bmp280_01",
      "type": "BMP280_BAROMETER",
      "name": "Hőmérséklet & Barométer",
      "pins": {
        "sda": 21,
        "scl": 22
      },
      "config": {
        "i2cAddress": "0x76",
        "defaultTemp": 24.5,
        "defaultPressure": 1013.25
      }
    },
    {
      "id": "rotary_01",
      "type": "KY040_ROTARY_ENCODER",
      "name": "Menü Navigátor Jeladó",
      "pins": {
        "clk": 18,
        "dt": 19,
        "sw": 23
      }
    },
    {
      "id": "btn_back",
      "type": "PUSH_BUTTON",
      "name": "Vissza Gomb",
      "pins": {
        "pin": 4
      },
      "config": {
        "pullUp": true
      }
    }
  ]
}
```

---

## 2. Projektkezelő Funkciók (Features)

### A. Projekt Életciklus Műveletek
1. **Új Projekt létrehozása (New Project):**
   - Varázsló (Wizard) sablonválasztóval:
     - 🌟 *Üres ESP32 Projekt*
     - 🌡️ *Időjárás Állomás & Rotary Menü (Kombinált projekt)*
     - 🎛️ *Rotary Encoder Alapok*
     - 🖥️ *SSD1306 OLED Grafika és Animációk*
     - 🔘 *Többgombos vezérlés & LED PWM*
2. **Projekt Megnyitása (Open Project):**
   - Helyi mappa vagy `.espproj` fájl megnyitása az Electron natív fájlválasztóján (`dialog.showOpenDialog`) keresztül.
   - Legutóbbi projektek listája (Recent Projects) gyors eléréssel.
3. **Projekt Mentése (Save / Save As):**
   - Automatikus mentés (Auto-save) lokálisan, illetve manuális mentés (`Ctrl+S` / `Cmd+S`) a lemezre.
4. **Exportálás Fizikai ESP32-re:**
   - **Arduino IDE formátum:** Egyetlen `.ino` vagy több fájlból álló Arduino vázlat mappa generálása, ami azonnal megnyitható az Arduino IDE-ben.
   - **PlatformIO formátum:** Teljes PlatformIO projekt struktúra legenerálása `platformio.ini` konfigurációval és `src/main.cpp` forrásfájllal.
   - **Áramköri kapcsolási rajz (Wiring Diagram PDF / Markdown):** A szimulátorban beállított lábkiosztás exportálása bekötési útmutatóként a valós kenyérdeszkás (breadboard) építéshez.

---

## 3. UI Megjelenés: Projekt Intéző (Project Explorer Sidebar)

A bal oldali sávban helyet kap a **Project Explorer**:

```
📁 PROJECT EXPLORER: [ESP32 Weather Station]
├── 📄 project.json
├── 🔌 circuit.json (Kattintásra periféria szerkesztő)
└── 📂 src/
    ├── 📄 main.ino (Aktív tab)
    ├── 📄 config.h
    └── 📄 display.cpp
-------------------------------------------------
⚙️ PERIPHERALS:
 [OLED 128x64]  --> GPIO 21, 22 (0x3C)
 [BMP280]       --> GPIO 21, 22 (0x76)
 [KY-040 Rotary]--> GPIO 18, 19, 23
 [+ Új periféria hozzáadása]
```

- Több fülke (Multi-tab) támogatás a kódszerkesztőben.
- Új fájl hozzáadása, átnevezése, törlése.
- Perifériák dinamikus hozzáadása / törlése és átkötése más GPIO lábakra.
