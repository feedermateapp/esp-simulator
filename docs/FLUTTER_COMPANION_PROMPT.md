# Flutter FeederMate Companion Dual-Rod & Session Szinkronizációs Feladatleírás (Prompt)

Másold be ezt a teljes promptot a `feeder_mate` Flutter projekt fejlesztőjének / AI ágensének:

```markdown
Kérlek implementáld a FeederMate ESP32 Hardware Companion kétirányú szinkronizációját és a 2-botos (Dual-Rod) támogatást a Flutter alkalmazásban a Nordic UART Service (NUS) JSON adatfolyamon keresztül.

### 🎯 Háttér és Architektúra
Az ESP32 hardver és a mobilapp BLE-n (NUS TX/RX) keresztül kommunikál JSON sorokkal (`\n` lezárással).
Az ESP32 mostantól támogatja az 1-botos (Hero Stopper) és a 2-botos (Dual Split Stopper) üzemmódot is független stopperekkel, saját célidőkkel és távolságokkal.

---

### 📋 Implementálandó Feladatok:

#### 1. `START_SESSION` Szinkronizáció Mobilról (`CompanionBleService`)
Amikor a felhasználó sessiont indít (pl. Casual, Practice, Competition módban):
- Küldjünk egy `START_SESSION` parancsot az ESP32-nek JSON formátumban:
```json
{
  "cmd": "START_SESSION",
  "rodCount": 2,          // 1 vagy 2 (a kiválasztott session botjainak száma alapján)
  "targetDistanceM": 65,  // Alapértelmezett távolság méterben
  "targetSec": 120        // Alapértelmezett dobásritmus célidő másodpercben
}
```
- A session leállításakor küldjünk `STOP_SESSION` parancsot: `{"cmd": "STOP_SESSION"}`.

#### 2. Bejövő Dobás Esemény Kezelése (`CAST_STARTED`)
Amikor az ESP32-n a horgász megnyomja a D14 (Bot #1) vagy D33 (Bot #2) fizikai gombot, az ESP32 a következő JSON eseményt küldi a mobilnak:
```json
{
  "type": "CAST_STARTED",
  "rodIndex": 0,          // 0 = Bot #1, 1 = Bot #2
  "castCount": 4,
  "targetSec": 120,
  "dist": 65,
  "ts": 1728038100
}
```
- Ezt feldolgozva a mobilappban a megfelelő indexű bot (`rodIndex: 0` vagy `1`) dobásidőzítőjét és dobásszámlálóját azonnal indítsuk el / frissítsük a megfelelő Providerben / Riverpod állapotban.

#### 3. Kétbotos Telemetria Heartbeat Feldolgozása (`HEARTBEAT`)
Az ESP32 5 másodpercenként küld állapotjelentést. Kezeld mindkét formátumot a JSON parserben:
- **1-Botos mód esetén:**
  ```json
  {"type":"HEARTBEAT","rodCount":1,"isTimerRunning":true,"elapsedSec":45,"targetSec":120,"castCount":3,"dist":65,"fishCount":2,"totalWeightKg":4.50}
  ```
- **2-Botos mód esetén:**
  ```json
  {
    "type": "HEARTBEAT",
    "rodCount": 2,
    "selectedRod": 0,
    "r1": { "running": true, "elapsed": 42, "target": 120, "casts": 3, "dist": 65 },
    "r2": { "running": false, "elapsed": 0, "target": 300, "casts": 1, "dist": 45 },
    "fishCount": 2,
    "totalKg": 4.50,
    "k1Kg": 4.50,
    "k2Kg": 0.00
  }
  ```
- Parse-old az `r1` és `r2` állapotokat és szinkronizáld a helyi modellekkel / UI állapottal.

#### 4. `CompanionDebugScreen` Frissítése
Bővítsd a Companion Debug képernyőt a következő funkciókkal és gombokkal:
- **"Start 1-Rod Session"** gomb (`rodCount: 1`, `targetDistanceM: 50`, `targetSec: 180`).
- **"Start 2-Rod Session"** gomb (`rodCount: 2`, `targetDistanceM: 65`, `targetSec: 120`).
- **"Bot #1 Cast"** (`{"cmd":"START_TIMER","rodIndex":0,"targetSec":120}`) és **"Bot #2 Cast"** (`{"cmd":"START_TIMER","rodIndex":1,"targetSec":300}`) tesztgombok.
- Telemetria kártyán mindkét bot aktuális állapotának (`r1` és `r2`) élő, dinamikus megjelenítése.

Kérlek végezd el a szükséges módosításokat a szerviz rétegben, a providerben és a debug képernyőn, biztosítva a null-safety-t és a tiszta hibakezelést.
```
