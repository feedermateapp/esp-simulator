# 🎣 FeederMate Smart Companion – Menürendszer & Kezelési Kézikönyv

> **Dokumentum verzió:** v2.3.0 (Interactive Session Wizard & Unified Rod Control Edition)  
> **Célhardver:** ESP32-S (NodeMCU-32S / DevKit V1) + 2.4" ST7789 IPS Kijelző (320x240) + Integrált Rotary Encoder (EC11) + 3 Fizikai Gomb (D14, D26, D33)  
> **Moduláris forrásfájlok:** [`firmware/feedermate_step1/`](file:///Users/laszlominczer/StudioProjects/esp-simulator/firmware/feedermate_step1/) & [`src/projects/feedermate-companion/src/`](file:///Users/laszlominczer/StudioProjects/esp-simulator/src/projects/feedermate-companion/src/)

---

## 🧭 1. Kezelőszervek & Fizikai Gombok Kiosztása

| Gomb / Jeladó | ESP32 GPIO Láb | Típus | Elsődleges Funkció (Főképernyő) | Funkció a Menüben / Varázslókban |
| :--- | :---: | :---: | :--- | :--- |
| **1. Gomb (DOBÁS / KO)** | **D14** | Fizikai Gomb | **Aktív Bot Dobás indítás (Stopper Start/Restart)** | **Visszalépés / Mégse** |
| **2. Gomb (MENÜ)** | **D26** | Fizikai Gomb | **Főmenü megnyitása / Visszatérés a Főképernyőre** | **Visszatérés a Főképernyőre** |
| **3. Gomb (BOTVÁLTÁS)** | **D33** | Fizikai Gomb | **Aktív Bot Váltása (Bot #1 ↔ Bot #2)** *(kizárólag 2-botos módban)* | **Almenü opció / Fókuszváltás** |
| **Rotary Tengely (SW)**| **D22** | Nyomógomb | **Aktív Bot Gyors Preset Menüjének megnyitása** | **Mező / Elem Kiválasztása & Jóváhagyása** |
| **Rotary Forgatás** | **D19 / D21**| Forgó Jeladó | **Aktív bot célidő presetjének pörgetése** (2, 5, 7, 10, 15, Custom) | **Menüpontok / Értékek Állítása fel/le** |

---

## 🖥️ 2. Képernyő Állapotok & Rendszertérkép

```text
[0. DASHBOARD FŐKÉPERNYŐ]
 ├── 1-Botos mód: Hero Stopper (216x114px) + Száktartalom + 3 Widget + Header
 └── 2-Botos mód: Dual Split Stopper (Bot #1 216x55px + Bot #2 216x55px) [Sárga keret = Aktív Bot]
       │
       ├── [D26 Gomb] ──> [1. FŐMENÜ (SCREEN_MAIN_MENU - 8 Menüpont)]
       │                    ├── 0. Horgászat Indítása (SCREEN_START_SESSION Wizard)
       │                    ├── 1. Taktikai Presetek (SCREEN_PRESET_MENU - Két Fül: Idő Ritmus & Távolság)
       │                    │     ├── [1. IDŐ RITMUS]: 2p, 5p, 7p, 10p, 15p, Custom (SCREEN_CUSTOM_TIME)
       │                    │     └── [2. TÁVOLSÁG]: 25m, 35m, 50m, 65m, 80m, 100m, Egyedi (SCREEN_DISTANCE)
       │                    ├── 2. Halfogás Rögzítése (SCREEN_CATCH_LOG)
       │                    │     ├── 1/2 Halfajta választás (Ponty, Kárász, Dévér, Amur...)
       │                    │     └── 2/2 Becsült súly finomhangolás (kg)
       │                    ├── 3. Haltartó Szákok (SCREEN_KEEPNET)
       │                    │     └── Szák #1 és Szák #2 súly + 20 kg limit őr
       │                    ├── 4. Etetési Távolság (SCREEN_DISTANCE)
       │                    │     └── Klipszelt méterszámláló (pl. 65 m)
       │                    ├── 5. Session Statisztika (SCREEN_SESSION_STATS)
       │                    │     └── Dobásritmus, átlagidő, leggyorsabb kapás
       │                    ├── 6. Rendszer Beállítások (SCREEN_SETTINGS - 5 Elem)
       │                    │     ├── Fényerő, Visszaszámlálás, Hangjelzés (Buzzer), Riasztó LED
       │                    │     └── Pontos Óra Kézi Beállítása (SCREEN_TIME_SETTINGS)
       │                    └── 7. Bluetooth Kapcsolat & Teszt (SCREEN_BLE_DEBUG)
       │                          ├── Élő TX/RX csomagfeed
       │                          └── Interaktív tesztgombok (Ping, Dobás, Fogás, Telemetria)
       │
       ├── [Rotary SW] ──> Aktív bot Taktikai Preset Menüje
       ├── [Rotary Forgatás] ──> Aktív bot célidő közvetlen léptetése a Dashboardon
       └── [D33 Gomb] ──> Aktív bot azonnali váltása (Bot #1 ↔ Bot #2) 2-botos üzemben
```

---

## 🚀 3. Horgászat Indítása Varázsló (`SCREEN_START_SESSION`)

Az ESP32 felületéről önállóan (mobilkapcsolat nélkül is) elindítható az új horgászat a Főmenü **"0. Horgaszat Inditasa"** pontjából:

1. **Interaktív Beállítómezők:**
   - **BOTOK SZÁMA:** `1 BOT` vagy `2 BOT` váltása Rotary kattintással/forgatással.
   - **BOT #1 RITMUS:** Választható preset (`2p`, `5p`, `7p`, `10p`, `15p`, `Custom`).
   - **BOT #2 RITMUS:** Választható preset a 2. botra (automatikusan rejtve marad 1 botos módban).
   - **TÁVOLSÁG:** Alapértelmezett klipsztávolság beállítása (pl. `65 m`).
   - **`> HORGASZAT INDITASA <` Gomb:** A mező kiválasztásakor:
     - Nullázza a session stoppert (`sessionSeconds = 0`).
     - Nullázza a botok dobásszámlálóit és stoppereit.
     - Nullázza a száktartalmakat és fogásnaplót.
     - Beállítja az új paramétereket (botszám, egyedi bot ritmusok, távolság).
     - Átlép a megújult Dashboardra és Bluetooth telemetriát szór a mobil appnak (`START_SESSION`).

---

## 🎯 4. 1-Botos vs 2-Botos Horgászat Egységesített Kezelése

### 1-Botos Működés (`rodCount = 1`):
* Egyetlen nagyméretű kártya mutatja a dobásidőt (`MM:SS`), a százalékos folyamatjelző csíkot és az aktív célidőt (`CÉL: 02:00`).
* A **D14** gomb nyomására a számláló 0-ról indul, növeli a dobásszámot és elküldi a `CAST_STARTED` BLE eseményt.
* A **D33** gomb inaktív (1 bot esetén nincs funkciója).
* A **Rotary SW** közvetlenül a Preset Menüt nyitja meg.

### 2-Botos Működés (`rodCount = 2`):
* Két egymás alatti önálló kártya jelenik meg: **Bot #1** (felül) és **Bot #2** (alul).
* **Független stopperek:** Mindkét botnak teljesen saját indulási ideje, célideje, eltelt másodperce, túlidő állapota és dobásszáma van.
* **Fókusz kijelzés:** Az éppen aktív bot kártyáját határozott sárga keret veszi körül.
* **Egységes Botváltás (D33 Gomb):** A **D33** gomb megnyomásakor az aktív bot azonnal átvált (`Bot #1 ↔ Bot #2`), a sárga keret átugrik.
* **Univerzális Dobásgomb (D14 Gomb):** A **D14** mindig az éppen fókuszban lévő aktív bot dobását indítja/újraindítja!
* **Rotary Működés:**
  - **Forgatás:** Mindig az aktív bot célidejét pörgeti.
  - **SW Nyomás:** Mindig az aktív bot Preset Menüjét nyitja meg.
* **Távolság kijelzés:** A jobb oldali távolság widget mindig az aktív bot távolságát mutatja.

---

## 🕒 5. Valós Idejű Óra (RTC) & Időszinkronizáció

* **Fejléc kijelzés:** A képernyő jobb felső sarkában diszkrét fehér `HH:MM` formátumban látható az aktuális pontos idő.
* **Automatikus BLE Szinkronizáció:** A mobilalkalmazás csatlakozáskor és session indításkor automatikusan elküldi a helyi időzónával korrigált pontos időt (`SYNC_TIME` JSON vagy TimeSync GATT).
* **Kézi Állítás:** A *Beállítások -> Óra Beállítás* menüpontban (`SCREEN_TIME_SETTINGS`) a Rotary forgatásával és kattintásával másodpercek alatt beállítható az óra és perc értéke.

---

## 📶 6. Bluetooth Low Energy (NUS JSON Protokoll)

* **Eszköznév:** `FeederMate-ESP32`
* **Fő Szolgáltatás:** Nordic UART Service (NUS `6E400001-...`)
* **Parancsok (Mobil -> ESP32):**
  - `START_SESSION`: `{ "cmd": "START_SESSION", "rodCount": 2, "targetDistanceM": 65, "targetSec": 120 }`
  - `STOP_SESSION`: `{ "cmd": "STOP_SESSION" }`
  - `START_TIMER`: `{ "cmd": "START_TIMER", "rodIndex": 0, "targetSec": 120 }`
  - `SYNC_TIME`: `{ "cmd": "SYNC_TIME", "time": "11:45" }`
  - `PING`: `{ "cmd": "PING", "ts": 1728038000 }`
* **Események (ESP32 -> Mobil):**
  - `CAST_STARTED`: `{ "type": "CAST_STARTED", "rodIndex": 0, "castCount": 3, "targetSec": 120, "dist": 65, "ts": ... }`
  - `CAST_STOPPED`: `{ "type": "CAST_STOPPED", "rodIndex": 0, "elapsedSec": 145, "ts": ... }`
  - `CATCH_ADDED`: `{ "type": "CATCH_ADDED", "rodIndex": 0, "species": "PONTY", "weightKg": 2.45, "keepnet": 1, "totalKg": 4.90, "ts": ... }`
  - `HEARTBEAT` (5 másodpercenként automatikus telemetria): 1-botos vagy 2-botos állapotcsomag (`r1`, `r2` struktúrával).

---

## 💡 7. Nyomógombok Bekötése a Breadboardon

* **D14 Gomb (Dobás / Mégse):** Gomb egyik lába ➔ `GPIO 14`, átlós lába ➔ `GND`
* **D26 Gomb (Menü / Főképernyő):** Gomb egyik lába ➔ `GPIO 26`, átlós lába ➔ `GND`
* **D33 Gomb (Aktív Bot Váltás):** Gomb egyik lába ➔ `GPIO 33`, átlós lába ➔ `GND`
* **Rotary EC11:** `CLK` ➔ `GPIO 19`, `DT` ➔ `GPIO 21`, `SW` ➔ `GPIO 22`, `+` ➔ `3.3V`, `GND` ➔ `GND`
* **Külső Riasztó LED:** Anód (+) ➔ `GPIO 13` (ellenálláson keresztül), Katód (-) ➔ `GND`
