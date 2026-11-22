# FeederMate Menütérkép & Verseny-Optimalizálási Útmutató

> **Dokumentum verzió:** 2.3 (Interactive Session Wizard & Unified Rod Control Edition)  
> **Cél:** Átfogó menü- és képernyőtérkép, valamint versenyhorgászati UX optimalizálási javaslatok a leggyorsabb és legpontosabb kezeléshez éles match/feeder versenyhelyzetben.

---

## 🗺️ I. Részletes Menütérkép & Képernyő Állapotgép (Screen Flow)

```mermaid
graph TD
    %% Fő csomópont
    DASH["0. DASHBOARD (Főképernyő)<br/>• 1-Botos Hero Stopper vagy 2-Botos Dual Split Stopper<br/>• Sárga keret: Aktív bot fókusza<br/>• Dobás: #X | Táv: Xm | Cél: MM:SS<br/>• Száktartalom (Sz1, Sz2...)<br/>• Session Stopper & Valós idejű óra (HH:MM)<br/>• BLE Kapcsolat ikon & Riasztás"]

    %% Dashboardról elérhető utak
    DASH -->|"Rotary Forgatás"| DASH_PRESET["Aktív Bot Célidő Preset Léptetés<br/>(2p, 5p, 7p, 10p, 15p, Custom)"]
    DASH -->|"Rotary SW"| WIZ_SW["Aktív Bot Preset Menü (SCREEN_PRESET_MENU)"]
    DASH -->|"D33 Gomb (2 bot esetén)"| FOCUS_TOGGLE["Aktív Bot Váltás (Bot #1 ↔ Bot #2)"]
    DASH -->|"D14 Gomb"| CAST_ACTIVE["Aktív Bot Dobás Indítás / Újraindítás<br/>(Stopper Start/Restart + BLE Csomag)"]
    DASH -->|"D26 Gomb"| MENU["FŐMENÜ (8 Menüpont)<br/>0. Horgászat Indítása<br/>1. Taktikai Presetek<br/>2. Halfogás Rögzítése<br/>3. Haltartó Szákok<br/>4. Etetési Távolság<br/>5. Session Statisztika<br/>6. Rendszer Beállítások<br/>7. Bluetooth Kapcsolat & Debug"]

    %% Menüpontok
    MENU -->|"[0] Kiválasztva"| WIZ_START["0. Horgászat Indítása Wizard<br/>• Botok száma: 1 BOT / 2 BOT<br/>• Bot #1 Ritmus: 2p..15p/Custom<br/>• Bot #2 Ritmus: 2p..15p/Custom<br/>• Távolság: 65 m<br/>• [ > HORGASZAT INDITASA < ]"]
    WIZ_START -->|"Indítás Jóváhagyva"| DASH

    MENU -->|"[1] Kiválasztva"| WIZ_SW["1. Taktikai Presetek (Aktív Bot)<br/>(2p, 5p, 7p, 10p, 15p, Custom)"]
    WIZ_SW -->|"CUSTOM választva"| SW_CUSTOM["Egyedi Célidő Dial (±30 mp)"]
    SW_CUSTOM -->|"Rotary SW"| DASH

    MENU -->|"[2] Kiválasztva"| WIZ_CATCH1["2. Halfogás Varázsló<br/>1/2 Halfajta választás (Ponty, Kárász...)"]
    WIZ_CATCH1 -->|"Rotary SW"| WIZ_CATCH2["2/2 Becsült Súly állítás (0.1..20.0 kg)"]
    WIZ_CATCH2 -->|"Rotary SW (Mentés)"| DASH

    MENU -->|"[3] Kiválasztva"| SUB_KEEPNET["3. Haltartó Szák Monitor<br/>• Szák #1 és Szák #2 súly<br/>• 20 kg limit figyelmeztetés"]
    MENU -->|"[4] Kiválasztva"| SUB_DIST["4. Etetési Távolság<br/>• Klipszelt távolság (pl. 65 m)"]
    MENU -->|"[5] Kiválasztva"| SUB_STATS["5. Session Statisztika<br/>• Dobásritmus, átlagidő, leggyorsabb kapás"]
    MENU -->|"[6] Kiválasztva"| SUB_SETTINGS["6. Rendszer Beállítások<br/>• Fényerő, Visszaszámláló, LED/Hang, Nyelv, Botszám<br/>• Pontos Óra Kézi Beállítása (HH:MM)"]
    MENU -->|"[7] Kiválasztva"| SUB_BLE["7. Bluetooth Kapcsolat & Debug<br/>• Élő TX/RX adatfolyam feed<br/>• Interaktív tesztgombok (Ping, Dobás, Fogás, Telemetria)"]

    SUB_KEEPNET -->|"D26 / D14"| DASH
    SUB_DIST -->|"D26 / D14"| DASH
    SUB_STATS -->|"D26 / D14"| DASH
    SUB_SETTINGS -->|"D26 / D14"| DASH
    SUB_BLE -->|"D26 / D14"| DASH
```

---

## 🕹️ II. Hardveres Kezelőszervek Funkciótáblázata Képernyőnként

| Képernyő | D14 Gomb (DOBÁS / KO) | D26 Gomb (MENÜ) | D33 Gomb (BOTVÁLTÁS) | Rotary Forgatás (CW/CCW) | Rotary SW Gombnyomás |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0. Dashboard** | **Aktív Bot Dobás indítás** | Főmenü megnyitása | **Aktív Bot Váltás** *(2 botnál)* | Aktív bot célidő preset léptetés | Aktív bot Preset menü |
| **0. Session Wizard**| Visszalépés (Főmenü) | Kilépés a Dashboardra | — | Érték állítása / Mező léptetés | Mező szerkesztés / **INDÍTÁS** |
| **1. Főmenü** | Visszalépés (Dashboard) | Kilépés a Dashboardra | — | 8 Menüpont közötti görgetés | Belépés a kiválasztott menüpontba |
| **2. Preset Menü** | Visszalépés (Dashboard) | Kilépés a Dashboardra | — | Presetek választása (2p..15p, Custom) | Aktív bot célidő jóváhagyása |
| **3. Custom Dial** | Visszalépés | Kilépés a Dashboardra | — | Idő finomhangolás (±30 mp) | Egyedi idő mentése aktív botra |
| **4. Fogás Varázsló** | Mégse / Vissza | Kilépés a Dashboardra | — | 1/2 Halfajta / 2/2 Súly léptetés | Tovább / Végleges Mentés |
| **5. Száktartalom** | Visszalépés | Kilépés a Dashboardra | — | Szákok közötti váltás | Aktív szák kiválasztása |
| **6. Távolság Állító**| Visszalépés | Kilépés a Dashboardra | — | Távolság állítás (±1 m) | Távolság mentése |
| **7. Session Stat** | Visszalépés | Kilépés a Dashboardra | — | Statisztikák görgetése | — |
| **8. Beállítások** | Visszalépés | Kilépés a Dashboardra | — | Opciók görgetése (Fényerő, Botszám...) | Módosítás / Órabeállítás |
| **9. BLE Debug** | Visszalépés | Kilépés a Dashboardra | — | Tesztgombok közötti navigáció | Kiválasztott teszt küldése |
| **10. Kézi Óra (HH:MM)**| Visszalépés | Kilépés a Dashboardra | — | Óra / Perc növelése, csökkentése | Óra ➔ Perc ➔ Mentés |

---

## 🏆 III. Versenyhorgászati UX Javaslatok

1. **Egységesített Kezelés 1 és 2 Bot Esetén:**
   - A **D14** gomb mindig az éppen fókuszban lévő aktív bot dobását indítja. Nem kell különböző gombokat keresgélni kapás és bedobás közben.
   - A **D33** gomb egyetlen gombnyomással átkapcsolja a fókuszt a másik botra, azonnal áthelyezve a kezelést és a sárga fókuszkeretet.
2. **Teljeskörű Hardveres Session Setup (`SCREEN_START_SESSION`):**
   - Vízparti beüléskor nem szükséges azonnal a telefont elővenni: az ESP32-ről másodpercek alatt beállítható a botszám, a két bot egyedi etetési ritmusa és a klipsztávolság, majd a horgászat tiszta lappal elindítható.
3. **Preset Megjegyzés Botonként:**
   - A methodos pörgős bot 2 percen ketyeghet, miközben a nagypontyos bot 7 vagy 10 percen várja a halat.
4. **Kettős Száklimit Őr (Keepnet Guard):**
   - 20 kg felett azonnali piros túlsúly figyelmeztetés a versenylevonások elkerülésére.
5. **Valós Idejű Bluetooth Szinkronizáció:**
   - A telefonon indított versenyautomatizmus (`START_SESSION`) azonnal frissíti az ESP32 beállításait, és a két eszköz (mobil és okosstopper) tökéletes összhangban üzemel.
