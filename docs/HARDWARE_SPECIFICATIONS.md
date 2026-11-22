# Hardver Specifikációk és Lábkiosztások (Hardware Specifications)

Ez a dokumentum rögzíti az ESP32 mikrokontroller és a hozzá kapcsolódó hardvermodulok pontos specifikációját, regisztertérképét, elektronikai jelformáit és a szimulált áramköri bekötéseket.

---

## 1. Rendszer Bekötési Mátrix (Circuit Wiring Matrix)

Az alábbi táblázat mutatja a projektben alkalmazott alapértelmezett lábkiosztást az ESP32 DevKit V1 és a modulok között:

| Modul | Modul Láb | ESP32 GPIO | Funkció / Típus | Megjegyzés |
| :--- | :--- | :--- | :--- | :--- |
| **I2C Busz** | SDA | **GPIO 21** | I2C Data (Kétirányú) | Hardveres I2C (Wire) alapértelmezett |
| **I2C Busz** | SCL | **GPIO 22** | I2C Clock | Hardveres I2C órajel |
| **SSD1306 OLED** | SDA / SCL | **GPIO 21 / 22**| I2C Kijelző | I2C Cím: `0x3C` (128x64 képpont) |
| **BMP280 Szenzor** | SDA / SCL | **GPIO 21 / 22**| I2C Barométer | I2C Cím: `0x76` (opcionálisan `0x77`) |
| **Rotary Encoder** | CLK (Phase A)| **GPIO 18 / 19** | Digitális Bemenet | Interrupt képes (RISING / FALLING) |
| **Rotary Encoder** | DT (Phase B) | **GPIO 19 / 21** | Digitális Bemenet | Iránydetektálás |
| **Rotary Encoder** | SW (Switch)  | **GPIO 22 / 23** | Digitális Bemenet | Belső Pull-up (`INPUT_PULLUP`), aktív LOW |
| **Beépített LED** | LED Pin | **GPIO 2**  | Digitális Kimenet / PWM | Kék beépített LED a lapkán |

---

## 2. FeederMate Smart Companion Hardver Lábkiosztás (Aktív Bekötés)

| Periféria / Modul | Láb / Pin | ESP32 GPIO | Mód & Polaritás | Funkció & Szerep |
| :--- | :--- | :--- | :--- | :--- |
| **ST7789 IPS Kijelző (320x240)** | MOSI (SDA) | **GPIO 23** | SPI Master Out | Nagyfelbontású színes adatvonal |
| | SCLK (SCL) | **GPIO 18** | SPI Clock | SPI órajelvonal |
| | CS | **GPIO 27** | Chip Select | Aktív LOW kijelző kiválasztás |
| | DC | **GPIO 4**  | Data/Command | Parancs/Adat választó |
| | RST | **GPIO 25** | Hardware Reset | Kijelző hardveres reset |
| | VCC / GND | 3.3V / GND | Tápellátás | 3.3V stabilizált táp |
| **EC11 Rotary Encoder** | CLK | **GPIO 19** | `INPUT_PULLUP` | Menü és Célidő léptetés / görgetés |
| | DT | **GPIO 21** | `INPUT_PULLUP` | Forgásirány detektálás (CW / CCW) |
| | SW (Nyomógomb) | **GPIO 22** | `INPUT_PULLUP` | Fókuszváltás (Bot 1 ↔ Bot 2) / Kiválasztás |
| **1. Gomb (KO / Bot #1)** | PIN | **GPIO 14** | `INPUT_PULLUP` | **Bot #1 Dobás indítás (Stopper Start)** / Visszalépés |
| **2. Gomb (MENÜ)** | PIN | **GPIO 26** | `INPUT_PULLUP` | **Főmenü megnyitása / Visszatérés a Főképernyőre** |
| **3. Gomb (Bot #2)** | PIN | **GPIO 33** | `INPUT_PULLUP` | **Bot #2 Dobás indítás (Stopper Start)** / Fókuszváltás |
| **Külső Riasztó LED** | PIN | **GPIO 13** | `OUTPUT` | Villogó túlidő riasztás & Visszajelzés |
| **Beépített LED** | PIN | **GPIO 2**  | `OUTPUT` | Lapkára integrált kék állapotjelző LED |

---

## 3. Rotary Encoder (KY-040) Működési Elv és Kvadratúra Jelek

A KY-040 egy mechanikai forgó jeladó, amely forgatáskor két darab 90 fokos fáziseltolású négyszögjelet (kvadratúra kód / Gray-kód) állít elő a `CLK` és `DT` kivezetéseken.

```
Óramutató járásával megegyező forgás (CW):
CLK: ──┐      ┌──────┐      ┌───
       └──────┘      └──────┘
DT:  ────┐      ┌──────┐      ┌─
         └──────┘      └──────┘

Óramutató járásával ellentétes forgás (CCW):
CLK: ────┐      ┌──────┐      ┌─
         └──────┘      └──────┘
DT:  ──┐      ┌──────┐      ┌───
       └──────┘      └──────┘
```

### Kvadratúra Állapotátmenetek (Gray Code State Table)

| Lépés (Step) | CW (Jobbra forgatás) `[CLK, DT]` | CCW (Balra forgatás) `[CLK, DT]` |
| :--- | :--- | :--- |
| **Nyugalmi állapot** | `[1, 1]` | `[1, 1]` |
| **1. köztes fázis** | `[0, 1]` | `[1, 0]` |
| **2. köztes fázis** | `[0, 0]` | `[0, 0]` |
| **3. köztes fázis** | `[1, 0]` | `[0, 1]` |
| **Következő retesz (Detent)** | `[1, 1]` | `[1, 1]` |

### Szoftveres Dekódolási Logika (Arduino ISR)
```cpp
void IRAM_ATTR isrRotaryCLK() {
  int clkVal = digitalRead(18);
  int dtVal = digitalRead(19);
  if (clkVal == LOW) {
    if (dtVal == HIGH) {
      encoderCount++; // CW (Óramutatóval egyező)
    } else {
      encoderCount--; // CCW (Óramutatóval ellentétes)
    }
  }
}
```

---

## 3. BMP280 / BME280 I2C Szenzor Specifikáció

A Bosch BMP280 egy nagy pontosságú digitális barometrikus nyomás- és hőmérsékletszenzor.

### I2C Címzés:
- Alapértelmezett I2C cím: `0x76` (ha az SDO láb a GND-re van kötve)
- Alternatív I2C cím: `0x77` (ha az SDO láb a VDD-re van kötve)

### Fontosabb I2C Regiszterek:

| Regiszter Cím | Név | Funkció | Szimulált Érték |
| :--- | :--- | :--- | :--- |
| `0xD0` | `ID` | Chip azonosító regiszter | `0x58` (BMP280) vagy `0x60` (BME280) |
| `0xE0` | `RESET` | Szoftveres reset | Írás esetén alaphelyzetbe áll (`0xB6`) |
| `0xF3` | `STATUS` | Konverziós állapotjelző | Bit 3: measuring, Bit 0: im_update |
| `0xF4` | `CTRL_MEAS`| Működési mód és túlmintavételezés | Normal/Forced/Sleep mode beállítás |
| `0xF5` | `CONFIG` | Szűrő (IIR filter) és készenléti idő | Standby time & filter beállítások |
| `0xF7 - 0xF9` | `PRESS_MSB..XLSB` | 20 bites nyers légnyomás adat | MSB (`0xF7`), LSB (`0xF8`), XLSB (`0xF9`) |
| `0xFA - 0xFC` | `TEMP_MSB..XLSB`  | 20 bites nyers hőmérséklet adat | MSB (`0xFA`), LSB (`0xFB`), XLSB (`0xFC`) |
| `0x88 - 0xA1` | `CALIB00..CALIB25`| Gyári kalibrációs konstansok | `dig_T1..dig_T3` (hő), `dig_P1..dig_P9` (nyomás) |

### Barometrikus Magasságszámítás Képlete:
$$h = 44330 \times \left( 1 - \left(\frac{P}{P_0}\right)^{\frac{1}{5.255}} \right)$$
- $P$: Mért légnyomás hPa-ban.
- $P_0$: Tengerszinti referenciaszint (alapértelmezett: $1013.25\text{ hPa}$).

---

## 4. SSD1306 128x64 OLED Kijelző Specifikáció

Az SSD1306 monokróm OLED kijelző 128 oszlopból és 64 sorból áll ($128 \times 64 = 8192\text{ képpont}$).

### I2C Protokoll:
- Alapértelmezett I2C cím: `0x3C` (ritkábban `0x3D`).
- **Vezérlőbájt (Control Byte):**
  - `0x00`: Utána parancsbájtok (Command stream) következnek.
  - `0x40`: Utána képpont adatbájtok (GDDRAM data stream) következnek.

### Memóriaszervezés (Page Addressing Mode):
- A 64 képpontos magasság 8 darab 8-bit magas vízszintes sávra ("Page 0" - "Page 7") van osztva.
- Minden bájt 8 vertikális pixelt vezérel az adott oszlopban (Bit 0 = felső pixel, Bit 7 = alsó pixel).
- Teljes képernyőméret: $128 \times 8\text{ bájt} = 1024\text{ bájt}$ Framebuffer.

### Támogatott Grafikus Parancsok a Szimulátorban:
- `clearDisplay()`: Framebuffer törlése (0x00).
- `drawPixel(x, y, color)`: Egyedi képpont be/kikapcsolása.
- `drawLine(x0, y0, x1, y1, color)`: Bresenham vonalrajzoló algoritmus.
- `drawRect(x, y, w, h)` / `fillRect(x, y, w, h)`: Téglalap keret és kitöltés.
- `drawCircle(x0, y0, r)` / `fillCircle(x0, y0, r)`: Kör rajzolás.
- `print(text)` / `setCursor(x, y)` / `setTextSize(size)`: Szövegkiírás beépített 5x7 és 8x8 fontkészlettel.
- `drawBitmap(x, y, bitmap, w, h, color)`: Képek és ikonok kirajzolása.
- `display()`: A belső framebuffer átvitele és megjelenítése a vásznon (HTML5 Canvas).
