#pragma once

#include <Arduino.h>

// =========================================================================
// FeederMate Smart Companion – Állapot és Adatmodellek (State Types)
// =========================================================================

// Képernyő Állapotok
enum ScreenState {
  SCREEN_DASHBOARD = 0,     // 0. Pro Főképernyő (Stopper + Száktartalom + 3 Widget)
  SCREEN_MAIN_MENU = 1,     // 1. Sárga gombos Főmenü (7 Fő Funkció)
  SCREEN_PRESET_MENU = 2,   // 2. Taktikai Preset Választó Menü (2, 5, 7, 10, 15, Custom)
  SCREEN_CUSTOM_TIME = 3,   // 3. Egyéni Célidő Beállító Képernyő (Custom Dial)
  SCREEN_CATCH_LOG = 4,     // 4. Halfogás & Súly Rögzítő Varázsló
  SCREEN_KEEPNET = 5,       // 5. Száktartalom & Versenylimit Őr (20kg limit)
  SCREEN_DISTANCE = 6,      // 6. Etetési Távolság Beállító
  SCREEN_SESSION_STATS = 7, // 7. Session Statisztika & Ritmus Elemzés
  SCREEN_START_SESSION = 8, // 8. Új Horgászat Indítása / Nullázás Megerősítő
  SCREEN_SETTINGS = 9,      // 9. Rendszer Beállítások
  SCREEN_BLE_DEBUG = 10,    // 10. Bluetooth Debug & Interaktív Teszt Képernyő
  SCREEN_TIME_SETTINGS = 11 // 11. Kézi Pontos Óra Beállító Képernyő (HH:MM)
};

// Taktikai Horgász Preset Struktúra
struct PresetItem {
  const char* name;        // Megjelenő név (pl. "2. 5 Perc")
  uint16_t targetSeconds;  // Célidő másodpercben (pl. 300 = 05:00)
  const char* description; // Rövid leírás / taktika
  uint16_t badgeColor;     // Kiemelő szín (RGB565)
};

// Taktikai Távolság Preset Struktúra
struct DistancePresetItem {
  const char* name;         // Megjelenő név (pl. "1. 25 meter")
  uint16_t distanceM;       // Távolság méterben (pl. 25, 35, 50, 65, 80, 100)
  const char* description;  // Rövid magyarázat (pl. "Partközeli / Rövid sáv")
  uint16_t badgeColor;      // Kiemelő szín (RGB565)
};

// Halfaj Struktúra a Gyorsnaplózáshoz
struct FishSpecies {
  const char* name;
  float defaultWeightKg;
  uint16_t color;
};

// Főmenü Elem Struktúra
struct MainMenuItem {
  const char* title;
  const char* subtitle;
  const char* badge;
  uint16_t iconColor;
  ScreenState targetScreen;
};

// Egyedi Bot Állapot Struktúra (1 vagy 2 botos működéshez)
struct RodState {
  int activePresetIndex;    // Aktív preset index (pl. 0 = 2p, 1 = 5p)
  uint32_t targetSeconds;   // Célidő másodpercben (pl. 300 mp)
  uint32_t customTempSeconds;// Egyéni temp célidő
  uint32_t elapsedSec;      // Eltelt stopperidő
  uint32_t timerStartMs;    // Dobás indítási időbélyeg (millis)
  uint32_t castCount;       // Dobások száma
  bool isTimerRunning;      // Fut-e a stopper
  bool isOvertime;          // Túllépte-e a célidőt
  uint16_t currentDistanceM; // Klipszelt etetési távolság (pl. 65 m)
};

// Teljes Rendszerállapot Struktúra
struct AppState {
  ScreenState currentScreen;
  
  // 1. Főmenü Állapot
  int selectedMainMenuIndex;

  // 2. Bot & Stopper Rendszer (1 vs 2 Botos Horgászat)
  uint8_t rodCount;          // 1 vagy 2 botos horgászat
  uint8_t selectedRodIndex;  // Aktív fókuszált bot (0 = Bot #1, 1 = Bot #2)
  RodState rods[2];          // Bot #1 és Bot #2 önálló állapota

  // Kompatibilitási mezők
  int selectedPresetIndex;
  int activePresetIndex;
  uint32_t targetSeconds;
  uint32_t customTempSeconds;
  bool isTimerRunning;
  bool isOvertime;
  uint32_t timerStartMs;
  uint32_t elapsedSec;
  uint32_t castCount;

  // 4. Halfogás Rögzítő Varázsló Állapot
  int catchSpeciesIndex;
  float catchTempWeightKg;
  int selectedCatchStep; // 0 = Halfaj választás, 1 = Súly állítás

  // 5. Száktartalom és 20kg Limit Őr
  uint16_t fishCount;       // Összes kifogott hal
  float totalWeightKg;      // Összes súly (kg)
  uint16_t keepnet1Fish;    // Szák #1 darabszám
  float keepnet1WeightKg;   // Szák #1 összsúly
  uint16_t keepnet2Fish;    // Szák #2 darabszám
  float keepnet2WeightKg;   // Szák #2 összsúly
  int activeKeepnetIndex;   // Aktív szák (0 = Szák #1, 1 = Szák #2)

  // 6. Taktikai Paraméterek, Session & Statisztika
  uint16_t targetDistanceM; // Klipszelt etetési távolság (pl. 65 m)
  uint16_t tempDistanceM;   // Átmenetileg állított távolság
  bool isSessionActive;     // true = Horgászat/Verseny folyamatban, false = Készenlét
  uint32_t sessionStartMs;  // Horgászat kezdeti időbélyege
  uint32_t fastestCatchSec; // Leggyorsabb kapás ideje

  // 7. Rendszer Beállítások & Valós Idejű Óra
  int selectedSettingIndex;
  uint8_t brightnessLevel;  // 1..5 (20% .. 100%)
  bool isCountdownMode;     // true = Countdown (Vissza), false = Count-up (Előre)
  bool buzzerEnabled;
  bool ledAlertEnabled;
  uint8_t languageIndex;    // 0 = HU, 1 = EN
  uint32_t rtcBaseEpochSec; // Valós idejű óra bázis (másodperc, pl. 8*3600 = 08:00:00)
  uint32_t rtcBootMs;       // Boot millis időbélyeg

  // 8. BLE Bluetooth Kapcsolat & Debug Állapot
  bool isBleConnected;      // true = Csatlakozva a mobil apphoz
  int selectedBleTestAction;// Kiválasztott teszt művelet (0 = PING, 1 = DOBÁS, 2 = FOGÁS, 3 = TELEMETRIA)

  // 9. Kézi Óra Beállító Állapot
  uint8_t tempClockHour;    // 0..23
  uint8_t tempClockMinute;  // 0..59
  uint8_t clockSettingStep; // 0 = Óra állítás (HH), 1 = Perc állítás (MM)

  // 10. Horgászat Indító Varázsló Állapot (Session Setup Wizard)
  uint8_t sessionSetupField;      // 0..4 (0=Botszám, 1=Bot 1 Ritmus, 2=Bot 2 Ritmus, 3=Távolság, 4=Indítás)
  uint8_t sessionSetupRodCount;   // 1 vagy 2
  uint8_t sessionSetupPreset1;    // Bot 1 preset index
  uint8_t sessionSetupPreset2;    // Bot 2 preset index
  uint16_t sessionSetupDistanceM; // Távolság méterben

  // 11. Taktikai Presetek Képernyő Állapot (Idő & Távolság Fülek)
  uint8_t presetTab;                  // 0 = IDŐ RITMUS, 1 = TÁVOLSÁG
  int selectedDistancePresetIndex;    // 0..6
};


