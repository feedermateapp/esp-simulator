# 🎣 FeederMate Hardware Companion – Rendszerterv & Specifikáció

> **Cél:** A `feeder_mate` Flutter mobilalkalmazáshoz készülő, versenyládára / rod-podra rögzíthető ESP32-alapú fizikai és virtuális okoseszköz (FeederMate Hardware Companion) teljes specifikációja.  
> **Célhardver:** ESP32 DevKit V1 (Xtensa Dual-Core 240MHz, BLE 4.2/5.0, I2C, GPIO)  
> **Szimulátor Támogatás:** Integrált C++ AST és Low-Level Xtensa LX6 emuláció.

---

## 🎯 1. Rendszer Célja és Funkciói

Horgászat közben az etetőanyagos, vizes vagy halas kézzel a mobiltelefon kezelése lassú és sérülékeny.
A **FeederMate Hardware Companion** a következő három alappillért látja el közvetlen fizikai gombokkal és kijelzővel:

1. **⏱️ Stopper & Dobásidőzítő Kezelés (Cast Timer):**
   - 1-kattintásos "Új Dobás" dedikált fizikai gomb (`GPIO 14`).
   - Nagy méretű, jól látható eltelt idő számláló (`MM:SS`).
   - Tervezett dobási idő (pl. 5 perc) és százalékos folyamatjelző.
   - Időleteléskor villogó LED / hangjelzés (`GPIO 13`).
   - Több bot támogatása (Bot #1, Bot #2).

2. **🐟 Gyors Halfogás Rögzítés (Quick Catch Log):**
   - Forgó jeladóval (Rotary Encoder) másodpercek alatt kiválasztható halfajta (Ponty, Kárász, Dévér, Amur, Keszeg, Egyéb).
   - Finomhangolható becsült súly (\(0.05\text{ kg} - 15.00\text{ kg}\)).
   - Egyetlen gombnyomásra (`SW`):
     - Elmenti a halat és hozzáadja az aktív haltartóhoz.
     - Lezárja az aktuális dobást (`endReason = fishCaught`).
     - Automatikusan újraindítja a dobásidőzítőt a következő dobáshoz.
     - BLE eseményként azonnal átküldi a `feeder_mate` mobilapp felé.

3. **🧺 Haltartó Szák & Versenylimit Őr (Keepnet Guard):**
   - Szákonkénti összsúly és darabszám nyilvántartása (`Szák #1`, `Szák #2`, `Szák #3`).
   - Súlylimit figyelés (pl. 20 kg / szák versenyszabályzat).
   - 80% felett figyelmeztetés, 90% felett villogó riasztás ("VÁLTS SZÁKOT!").
   - 1-kattintásos szákváltás a felületről.

4. **📶 Bluetooth Low Energy (BLE) Szinkronizáció:**
   - Automatikus háttérkapcsolat a `feeder_mate` Flutter appal.
   - Kétirányú adatcsere (események beküldése és beállítások fogadása).

---

## 🏛️ 2. Hardver Kialakítás & Lábkiosztás (FeederMate v2.0 PRO)

| Komponens | Funkció | ESP32 GPIO | Mód & Polaritás | Leírás / Szerep |
| :--- | :--- | :--- | :--- | :--- |
| **ST7789 IPS Kijelző (320x240)** | `MOSI` | **GPIO 23** | SPI Master Out | Nagyfelbontású színes képernyő adatvonal |
| | `SCLK` | **GPIO 18** | SPI Clock | SPI órajelvonal |
| | `CS` | **GPIO 27** | Chip Select | Aktív LOW kijelző kiválasztás |
| | `DC` | **GPIO 4**  | Data/Command | Parancs/Adat választó |
| | `RST` | **GPIO 25** | Hardware Reset | Kijelző hardveres reset |
| | `VCC / GND` | 3.3V / GND | Tápellátás | 3.3V logikai tápfeszültség |
| **EC11 Forgó Jeladó** | `CLK` | **GPIO 19** | `INPUT_PULLUP` | Menü görgetés & Célidő preset pörgetés |
| | `DT` | **GPIO 21** | `INPUT_PULLUP` | Forgásirány detektálás (CW / CCW) |
| | `SW` (Kattintás) | **GPIO 22** | `INPUT_PULLUP` | Fókuszváltás (Bot #1 ↔ Bot #2) / Jóváhagyás |
| **1. Gomb (KO / Bot #1)** | `PIN` | **GPIO 14** | `INPUT_PULLUP` | **Bot #1 Dobás indítás (Stopper Start)** / Vissza |
| **2. Gomb (MENÜ)** | `PIN` | **GPIO 26** | `INPUT_PULLUP` | **Főmenü megnyitása / Visszatérés a Főképernyőre** |
| **3. Gomb (Bot #2)** | `PIN` | **GPIO 33** | `INPUT_PULLUP` | **Bot #2 Dobás indítás (Stopper Start)** / Fókusz |
| **Riasztó LED** | `PIN` | **GPIO 13** | `OUTPUT` | Villogó túlidő riasztás & Mentés visszajelzés |
| **Beépített LED** | `PIN` | **GPIO 2**  | `OUTPUT` | Kék állapotjelző LED a vezérlőn |

---

## 🖥️ 3. OLED Képernyő Terv (4 Lapozható Nézet)

```text
┌────────────────────────┐  ┌────────────────────────┐
│ ⏱️ BOT #1   [04:23]    │  │ 🐟 HALFOGÁS RÖGZÍTÉS   │
│ Cél: 05:00  (87%)      │  │ Fajt: PONTY            │
│ Táv: 45 m   Bite: --   │  │ Súly: [ 2.45 kg ]      │
│ [GOMB: ÚJ DOBÁS]       │  │ Szák: #1 (16.4kg)      │
└────────────────────────┘  └────────────────────────┘
  1. DOBÁS STOPPER NÉZET      2. GYORS HALFOGÁS MENÜ

┌────────────────────────┐  ┌────────────────────────┐
│ 🧺 SZÁK #1   16.4/20kg │  │ 🌦️ VÍZPARTI ÁLLAPOT    │
│ [████████░░] 82% 7db   │  │ BLE: CSATLAKOZVA 📱    │
│ SZÁK #2: 4.2 kg (2db)  │  │ Légnyomás: 1014.8 hPa  │
│ [SW: Váltás Szák 2-re] │  │ Hőmérséklet: 22.4 °C   │
└────────────────────────┘  └────────────────────────┘
  3. HALTARTÓ MONITOR         4. IDŐJÁRÁS & BLE STÁTUSZ
```

---

## 📶 4. FeederMate BLE GATT Protokoll

* **Szolgáltatás (Service):** `0000FEE0-0000-1000-8000-00805F9B34FB`

### Karakterisztikák:
1. **`CAST_EVENT` (`0xFEE1`, NOTIFY):**
   - Bájtok: `[uint8 eventType, uint8 rodIndex, uint16 durationSec, uint8 distanceM]`
   - `eventType`: `0 = Start`, `1 = CatchEnd`, `2 = ManualStop`.
2. **`CATCH_EVENT` (`0xFEE2`, NOTIFY & WRITE):**
   - Bájtok: `[uint8 speciesId, uint16 weightGrams, uint8 keepnetIndex, uint8 rodIndex]`
   - `speciesId`: `0=Ponty, 1=Kárász, 2=Dévér, 3=Amur, 4=Bodorka, 5=Egyéb`.
3. **`KEEPNET_STATE` (`0xFEE3`, NOTIFY & READ/WRITE):**
   - Bájtok: `[uint8 keepnetIndex, uint16 totalWeightGrams, uint8 fishCount, uint16 maxLimitGrams]`
4. **`ENV_METRICS` (`0xFEE4`, NOTIFY):**
   - Bájtok: `[int16 tempC_x10, uint16 pressureHpa_x10]`

---

## 📱 5. Flutter (`feeder_mate`) Kapcsolódás

A Flutter alkalmazás oldalon a `FeederMateBleService` fogadja a fenti bájtokat, és közvetlenül meghívja a `SessionEngine` metódusait:
- `CAST_EVENT (Start)` \(\rightarrow\) `sessionEngine.startCastTimer(sessionId, rodIndex: rodIndex, distanceMeters: distanceM)`
- `CATCH_EVENT` \(\rightarrow\) `sessionEngine.addCatch(sessionId: sessionId, species: species, estimatedWeightGrams: weightGrams, keepnetNumber: keepnetIndex, rodIndex: rodIndex)`
