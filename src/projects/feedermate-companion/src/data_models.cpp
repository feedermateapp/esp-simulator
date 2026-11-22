#include "data_models.h"

// 1. Taktikai Preset Adatbázis (2, 5, 7, 10, 15 perc + Custom)
static const PresetItem PRESETS_DATABASE[] = {
  { "1. 2 Perc",            120, "02:00 - Porgos versenytaktika",     COLOR_SUCCESS },
  { "2. 5 Perc",            300, "05:00 - Standard method / pellet",  COLOR_ACCENT  },
  { "3. 7 Perc",            420, "07:00 - Kozepes varakozasi ido",    COLOR_WARN    },
  { "4. 10 Perc",           600, "10:00 - Szelektiv darabos utem",    COLOR_YELLOW  },
  { "5. 15 Perc",           900, "15:00 - Nagyhalas varakozo taktika",COLOR_TEXT_MUTED },
  { "6. Custom (Egyeni)",   180, "Sajat egyeni idobeallitas",         COLOR_WHITE   }
};
static const int PRESET_COUNT = sizeof(PRESETS_DATABASE) / sizeof(PRESETS_DATABASE[0]);

// 2. Taktikai Távolság Preset Adatbázis (25, 35, 50, 65, 80, 100m + Egyéni)
static const DistancePresetItem DISTANCE_PRESETS_DATABASE[] = {
  { "1. 25 meter",    25,  "Partkozeli / Rovid sav",      COLOR_ACCENT },
  { "2. 35 meter",    35,  "Klasszikus method sav",       COLOR_SUCCESS },
  { "3. 50 meter",    50,  "Kozepes method / bordas",     COLOR_WARN },
  { "4. 65 meter",    65,  "Standard versenytavolsag",    COLOR_YELLOW },
  { "5. 80 meter",    80,  "Nagy tavdobas / tavoli sav",  COLOR_ACCENT },
  { "6. 100 meter",  100,  "Extrem tavdobas",             COLOR_WHITE },
  { "7. Egyeni Tav",   0,  "Palcas fordulatszamlalo",     COLOR_TEXT_MUTED }
};
static const int DISTANCE_PRESET_COUNT = sizeof(DISTANCE_PRESETS_DATABASE) / sizeof(DISTANCE_PRESETS_DATABASE[0]);

// 3. Halfaj Adatbázis a Gyorsnaplózáshoz
static const FishSpecies SPECIES_DATABASE[] = {
  { "PONTY",   2.0f, COLOR_WARN    },
  { "KARASZ",  0.6f, COLOR_ACCENT  },
  { "DEVER",   0.9f, COLOR_WHITE   },
  { "AMUR",    3.5f, COLOR_SUCCESS },
  { "KESZEG",  0.3f, COLOR_TEXT_MUTED },
  { "EGYEB",   1.2f, COLOR_YELLOW  }
};
static const int SPECIES_COUNT = sizeof(SPECIES_DATABASE) / sizeof(SPECIES_DATABASE[0]);

// 3. Főmenü Elemek Adatbázisa (8 Menüpont)
static const MainMenuItem MAIN_MENU_ITEMS[] = {
  { "1. Halfogas",            "Halfaj es suly naplozasa",            "+ UJ HAL",    COLOR_WARN,       SCREEN_CATCH_LOG },
  { "2. Szaktartalom",        "20 kg limit es szaksuly",             "20kg LIMIT", COLOR_SUCCESS,    SCREEN_KEEPNET },
  { "3. Presetek",            "2, 5, 7, 10, 15 perc & egyedi ido",   "PRESETEK",    COLOR_ACCENT,     SCREEN_PRESET_MENU },
  { "4. Tavolsag",            "Zsinorklipszelt etetesi tavolsag",    "TAVOLSAG",    COLOR_YELLOW,     SCREEN_DISTANCE },
  { "5. Statisztika",         "Dobasritmus es atlagos idok",         "STATISZTIKA", 0xC9BF,          SCREEN_SESSION_STATS },
  { "6. Horgaszat Inditasa",  "Uj horgaszat setup & inditas",        "START",       COLOR_SUCCESS,    SCREEN_START_SESSION },
  { "7. Beallitasok",         "Fenyero, stopper irany, botszam",     "SETUP",       COLOR_TEXT_MUTED, SCREEN_SETTINGS },
  { "8. Bluetooth Debug",     "BLE kapcsolat es csomagtesztek",      "BLE TEST",  COLOR_ACCENT,     SCREEN_BLE_DEBUG }
};
static const int MAIN_MENU_COUNT = sizeof(MAIN_MENU_ITEMS) / sizeof(MAIN_MENU_ITEMS[0]);

int getPresetCount() { return PRESET_COUNT; }
const PresetItem& getPreset(int index) {
  if (index < 0) index = 0;
  if (index >= PRESET_COUNT) index = PRESET_COUNT - 1;
  return PRESETS_DATABASE[index];
}

int getDistancePresetCount() { return DISTANCE_PRESET_COUNT; }
const DistancePresetItem& getDistancePreset(int index) {
  if (index < 0) index = 0;
  if (index >= DISTANCE_PRESET_COUNT) index = DISTANCE_PRESET_COUNT - 1;
  return DISTANCE_PRESETS_DATABASE[index];
}

int getSpeciesCount() { return SPECIES_COUNT; }
const FishSpecies& getSpecies(int index) {
  if (index < 0) index = 0;
  if (index >= SPECIES_COUNT) index = SPECIES_COUNT - 1;
  return SPECIES_DATABASE[index];
}

int getMainMenuCount() { return MAIN_MENU_COUNT; }
const MainMenuItem& getMainMenuItem(int index) {
  if (index < 0) index = 0;
  if (index >= MAIN_MENU_COUNT) index = MAIN_MENU_COUNT - 1;
  return MAIN_MENU_ITEMS[index];
}
