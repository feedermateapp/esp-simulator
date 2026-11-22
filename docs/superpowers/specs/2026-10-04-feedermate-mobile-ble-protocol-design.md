# FeederMate Smart Companion – BLE Kommunikációs Protokoll és Mobil Integrációs Terv

**Dátum:** 2026-10-04  
**Verzió:** 1.0.0  
**Állapot:** Tervezet / Jóváhagyva későbbi moduláris implementációhoz  
**Célrendszerek:** ESP32-S (Arduino C++) & FeederMate Mobile App (Flutter / Drift / Riverpod)

---

## 1. Áttekintés és Rendszer-Architektúra

A FeederMate Smart Companion és a FeederMate Flutter mobil alkalmazás közötti vezeték nélküli kapcsolat **Bluetooth Low Energy (BLE GATT)** alapú. A cél egy energiatakarékos, megbízható és valós idejű kétirányú kapcsolat biztosítása a vízparton, miközben a mobiltelefon mobilinternete (4G/5G) zavartalan marad.

```
+-------------------------------------------------------------+
|               FeederMate Flutter Mobil App                  |
|  - Drift SQLite Adatbázis (Event-Sourcing: SessionEvent)    |
|  - Riverpod State Management (Timer, Catches, Keepnets)     |
|  - GPS, Időjárás, Értesítések, Háttér rezgés                |
+------------------------------^------------------------------+
                               | BLE GATT (2-Way)
+------------------------------v------------------------------+
|            ESP32-S FeederMate Smart Companion               |
|  - ST7789 2.4" TFT Kijelző (Pro Dashboard & Menü Rendszer)  |
|  - EC11 Rotary Encoder & Nyomógombok (D14 KO, D26 Menu)     |
|  - Offline NVS Gyűrűpuffer & Valós Idejű Időzítő            |
+-------------------------------------------------------------+
```

---

## 2. BLE GATT Szolgáltatások és Karakterisztikák

**Alap UUID prefix:** `0000xxxx-F33D-4EA7-8E2A-FEEDE8000000`

### 2.1. Telemetry Service (`0x1830`)
Folyamatos, valós idejű állapotközvetítés (alacsony késleltetés).
- **`LiveTimerState` (`0x2A01`, Read / Notify 1 Hz):**
  - Csomagméret: 12 bájt
  - Tartalom: eltelt session idő (u32), dobás ideje (u16), célidő (u16), bot index (u8), időzítő állapot (u8), dobásszám (u8), akku % (u8).
- **`LiveKeepnetState` (`0x2A02`, Read / Notify OnChange):**
  - Csomagméret: 10 bájt
  - Tartalom: összsúly grammban (u32), össz darabszám (u16), 1. szák súly (u16), 2. szák súly (u16).

### 2.2. Event Stream Service (`0x1831`)
Eseményvezérelt kommunikáció (1:1 mapping a mobil app `SessionEvent` modelljével).
- **`HardwareEventStream` (`0x2B01`, Read / Indicate megerősítéssel):**
  - ESP32 $\rightarrow$ Mobil irány.
  - `0x01: EVENT_CAST_STARTED` (KO megnyomása $\rightarrow$ `CastTimerStarted`)
  - `0x02: EVENT_MISSED_BITE` (Üres betekerés $\rightarrow$ `MissedBiteRecorded`)
  - `0x03: EVENT_CATCH_LOGGED` (ESP32-ről rögzített hal $\rightarrow$ `CatchAdded`)
- **`MobileCommandStream` (`0x2B02`, Write with Response):**
  - Mobil $\rightarrow$ ESP32 irány.
  - `0x81: CMD_SET_TIMER` (Időzítő start/stop/nullázás a telefonról)
  - `0x82: CMD_REMOTE_CATCH_SYNC` (Mobilon rögzített hal beírása a kijelzőre)
  - `0x83: CMD_SET_ACTIVE_PRESET` (Preset vagy távolság átállítása)

### 2.3. Configuration & Sync Service (`0x1832`)
- **`TacticalPresetsConfig` (`0x2C01`, Read / Write):** Taktikai idők (2m, 5m, 7m, 10m stb.) és etetési távolságok listája.
- **`KeepnetLimitConfig` (`0x2C02`, Read / Write):** Szák felső súlyhatár (pl. 20.0 kg) és riasztási küszöbök.
- **`SpeciesDictionary` (`0x2C03`, Read / Write):** Top 8 halfaj gyorslista az ESP32 enkóderes kiválasztásához.

### 2.4. System & Security Service (`0x1833`)
- **`DeviceStatus` (`0x2D01`, Read / Notify):** Hardver állapot, akku feszültség, hibakódok.
- **`TimeSync` (`0x2D02`, Write):** Mobil Unix Epoch UTC idő másodpercben / milliszekundumban.

---

## 3. Biztonság és Párosítás (6-jegyű Passkey Bonding)

1. Az ESP32 `DisplayOnly`, a telefon `KeyboardOnly` módban kezdeményez BLE SMP biztonsági párosítást.
2. Az ESP32 kijelzőjén megjelenik egy véletlenszerű 6-jegyű kód (pl. `482 915`).
3. A horgász beírja az appban.
4. Sikeres kötés (Bonding) után a kulcsok az ESP32 NVS tárolójába kerülnek, a későbbi csatlakozás a vízparton már **automatikus és titkosított**.

---

## 4. Fokozatos, Kis Léptékű Bevezetési Ütemterv (Roadmap)

A teljes rendszer lépésről lépésre, önállóan működő fázisokban valósul meg:

1. **Fázis 1: Alap BLE Kapcsolat és Kijelző Visszajelzés**
   - BLE hirdetés (`FeederMate-XXXX`), kapcsolat felépülés / bontás kezelése.
   - BLE állapotikon megjelenítése a TFT fejlécben (Piros = leválasztva, Kék = csatlakozva).
   - 6-jegyű Passkey felugró ablak a kijelzőn.

2. **Fázis 2: Egyirányú Élő Telemetria (ESP32 $\rightarrow$ Mobil)**
   - `LiveTimerState` periodikus értesítés (1 Hz).
   - Flutter oldalon az élő időzítő widget összekötése a BLE stream-mel.

3. **Fázis 3: Kétirányú Gomb- és Eseményszinkronizáció**
   - ESP32 fizikai KO gomb esemény átadása $\rightarrow$ Drift `CastTimerStarted` generálás.
   - Mobilról indított időzítő indítás $\rightarrow$ ESP32 számláló azonnali indulása.

4. **Fázis 4: Halfogás és Száktelítettség Kétirányú Tükrözése**
   - ESP32-n beírt hal elküldése a mobilnak (GPS koordináta + időjárás automatikus csatolása).
   - Mobilon beírt hal és szák összsúly azonnali frissítése az ESP32 képernyőjén.

5. **Fázis 5: Taktikai Presetek & Rendszerbeállítások Szinkronizálása**
   - Kedvenc időzítők és etetési távolságok konfigurálása a mobilról.
