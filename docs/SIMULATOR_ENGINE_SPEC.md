# Szimulációs Motor és API Specifikáció (Simulator Engine Spec)

Ez a dokumentum rögzíti az **ESP32 Szimulációs Motor** belső működését, az Arduino C++ API kompatibilitási réteget, a megszakításkezelést és az I2C tranzakciók lefolyását.

---

## 1. Végrehajtási Életciklus (Execution Lifecycle)

A szimulátor az Arduino és ESP-IDF programozási modellt követi:

```
[Start / Run]
      │
      ▼
 ┌─────────────┐
 │  setup()    │ ── Egyetlen egyszer fut le az inicializáláskor (pinMode, Wire.begin, Serial.begin)
 └─────────────┘
      │
      ▼
 ┌─────────────┐◄──────────────────────────────┐
 │  loop()     │                               │
 └─────────────┘                               │ Folyamatos aszinkron
      │                                        │ ütemezés
      ▼                                        │ (nem blokkolja a UI-t)
 ┌─────────────┐                               │
 │ delay(ms)   │ ── Promise-alapú várakozás   │
 └─────────────┘                               │
      │                                        │
      └────────────────────────────────────────┘
```

### Motor Állapotok (Engine States)
- `STOPPED`: A motor áll, a GPIO-k le vannak tiltva, a belső órajel 0.
- `RUNNING`: A `loop()` folyamatosan ütemeződik az állítható sebességszorzóval (0.5x, 1x, 2x, 5x).
- `PAUSED`: A végrehajtás szünetel, az időzítők és a GPIO állapotok megmaradnak, egyetlen lépés (`STEP`) végrehajtható.
- `ERROR`: Hiba esetén a motor leáll és hibaüzenetet küld a Serial Monitorra és a UI értesítő sávra.

---

## 2. Arduino C++ API Kompatibilitási Réteg

A felhasználó a megszokott Arduino C++ kódformátumban írhatja meg a kódját, amit a szimulátor motorja közvetlenül végrehajt a beépített API objektumokon keresztül:

### A. Digitális & Analóg I/O
- `pinMode(pin: number, mode: 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'INPUT_PULLDOWN')`
- `digitalWrite(pin: number, val: 0 | 1 | HIGH | LOW)`
- `digitalRead(pin: number): 0 | 1`
- `analogRead(pin: number): number` (0 - 4095, 12 bites ADC)
- `analogWrite(pin: number, val: number)` (0 - 255, PWM LED vezérléshez)

### B. Megszakítások (Interrupts)
- `attachInterrupt(pin: number, isr: () => void, mode: 'RISING' | 'FALLING' | 'CHANGE' | 'ONLOW' | 'ONHIGH')`
- `detachInterrupt(pin: number)`
- **Működés:** Amikor a felhasználó a felületen elforgatja a Rotary Encodert vagy megnyom egy gombot, a `GPIOManager` azonnal ellenőrzi az élváltást. Ha a regisztrált él bekövetkezik, az ISR függvény szinkronban és azonnal meghívódik.

### C. Időzítések (Time & Delays)
- `delay(ms: number): Promise<void>` (Aszinkron nem-blokkoló várakozás)
- `delayMicroseconds(us: number): Promise<void>`
- `millis(): number` (A szimulátor indulása óta eltelt virtuális ezredmásodpercek száma)
- `micros(): number` (Virtuális mikromásodpercek száma)

### D. Soros Port (Serial Monitor)
- `Serial.begin(baudRate: number)` (pl. 9600, 115200)
- `Serial.print(data: any)`
- `Serial.println(data: any)`
- `Serial.printf(format: string, ...args: any[])`
- `Serial.available(): number`
- `Serial.read(): number`
- `Serial.readString(): string`

### E. I2C Busz (TwoWire / Wire)
- `Wire.begin(sda?: number, scl?: number)` (Alapértelmezett: SDA = 21, SCL = 22)
- `Wire.beginTransmission(address: number)` (Tranzakció megnyitása)
- `Wire.write(data: number | number[] | Uint8Array)` (Adatbájtok pufferbe írása)
- `Wire.endTransmission(): number` (Tranzakció lezárása és küldése a perifériának, visszatér: 0 = siker / ACK)
- `Wire.requestFrom(address: number, quantity: number): number` (Bájtok kérése az I2C eszköztől)
- `Wire.read(): number` (Egyetlen bájt kiolvasása a bejövő pufferből)
- `Wire.available(): number` (Kiolvasható bájtok száma)

### F. Magas szintű Eszköz API-k (Adafruit / U8g2 stílus)
A szimulátor beépítve biztosítja a legnépszerűbb könyvtárak felületét is:
- `Adafruit_BMP280` / `Adafruit_BME280`:
  - `bmp.begin(address)`
  - `bmp.readTemperature(): number` (°C)
  - `bmp.readPressure(): number` (Pa vagy hPa)
  - `bmp.readAltitude(seaLevelhPa?: number): number` (méter)
- `Adafruit_SSD1306`:
  - `display.begin(SSD1306_SWITCHCAPVCC, 0x3C)`
  - `display.clearDisplay()`
  - `display.setTextSize(size)`
  - `display.setTextColor(WHITE)`
  - `display.setCursor(x, y)`
  - `display.print(text)` / `display.println(text)`
  - `display.drawPixel(x, y, color)`
  - `display.drawLine(x0, y0, x1, y1, color)`
  - `display.drawRect(x, y, w, h, color)`
  - `display.fillRect(x, y, w, h, color)`
  - `display.drawCircle(x, y, r, color)`
  - `display.fillCircle(x, y, r, color)`
  - `display.display()`

---

## 3. Logikai Hullámforma Analizátor (Waveform Logic Analyzer)

A motor belső mintavételező gyűrűs puffert (Ring Buffer) tart fenn a kijelölt GPIO lábakhoz (pl. GPIO 18 CLK, GPIO 19 DT, GPIO 23 SW):
- **Mintavételi felbontás:** 1 ms vagy élváltásonkénti eseményvezérelt időszelet.
- **Megjelenítés:** Vízszintes idővonal a képernyő alján, amelyen látható a jelek fáziseltolódása a forgatás során, és a prellmentes gombnyomások.
