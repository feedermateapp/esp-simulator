#include "screen_subscreens.h"
#include "screen_dashboard.h"
#include "ble_manager.h"

// =========================================================================
// 1. HALFOGÁS RÖGZÍTŐ VARÁZSLÓ (`SCREEN_CATCH_LOG`)
// =========================================================================

void updateCatchWeightDigitsOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillRect(10, 80, 300, 60, COLOR_BG);

  char wStr[16];
  sprintf(wStr, "%.1f kg", state.catchTempWeightKg);
  tft->setTextSize(5);
  tft->setTextColor(COLOR_WARN, COLOR_BG);
  int len = strlen(wStr);
  int x = 160 - (len * 15);
  if (x < 14) x = 14;
  tft->setCursor(x, 88);
  tft->print(wStr);

  // Új száksúly előrejelzés
  tft->setTextSize(1);
  tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
  tft->setCursor(16, 150);
  char nextBuf[48];
  sprintf(nextBuf, "Uj szakosszsuly mentes utan: %.1f kg   ", state.totalWeightKg + state.catchTempWeightKg);
  tft->print(nextBuf);
}

static void renderCatchSpeciesCarousel(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;
  int speciesCount = getSpeciesCount();
  const FishSpecies& curr = getSpecies(state.catchSpeciesIndex);
  int prevIdx = (state.catchSpeciesIndex - 1 + speciesCount) % speciesCount;
  int nextIdx = (state.catchSpeciesIndex + 1) % speciesCount;

  tft->fillRect(8, 36, 304, 24, COLOR_CARD_BG);

  tft->setTextSize(1);
  // Előző fajta
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(16, 42);
  tft->printf("< %s", getSpecies(prevIdx).name);

  // Aktív kiválasztott fajta (Középen kiemelve)
  tft->setTextSize(2);
  tft->setTextColor(curr.color, COLOR_CARD_BG);
  tft->setCursor(110, 38);
  tft->printf("[ %s ]", curr.name);

  // Következő fajta
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(240, 42);
  tft->printf("%s >", getSpecies(nextIdx).name);
}

void drawCatchLogScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_WARN);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_WARN, COLOR_HEADER_BG);
  tft->setCursor(8, 9);
  tft->print("HALFOGAS GYORSNAPLOZASA");

  // Felső Kártya: Halfaj Karusszel
  tft->fillRoundRect(6, 30, 308, 36, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 30, 308, 36, 6, COLOR_WARN);
  renderCatchSpeciesCarousel(state);

  // Központi Súly Kártya
  tft->fillRoundRect(6, 72, 308, 98, 6, COLOR_CARD_BG);
  drawThickRoundRect(6, 72, 308, 98, 6, 2, COLOR_WARN);
  tft->fillRect(10, 78, 300, 64, COLOR_BG);
  updateCatchWeightDigitsOnly(state);

  // Alsó Vezérlősáv
  tft->fillRoundRect(6, 176, 308, 58, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 176, 308, 58, 6, 0x2965);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
  tft->setCursor(14, 186);
  tft->print("[ROTARY NYOMAS]: HAL MENTESE A SZAKBA");
  tft->setTextColor(COLOR_WARN, COLOR_CARD_BG);
  tft->setCursor(14, 202);
  tft->print("[ROTARY TEKERES]: Becsult suly (+/- 0.1 kg)");
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 218);
  tft->print("[KO GOMB]: Megse / Visszalepes");
}

void handleCatchLogRotary(int delta, AppState& state) {
  state.catchTempWeightKg += (delta * 0.1f);
  if (state.catchTempWeightKg < 0.1f) state.catchTempWeightKg = 0.1f;
  if (state.catchTempWeightKg > 50.0f) state.catchTempWeightKg = 50.0f;
  updateCatchWeightDigitsOnly(state);
}

bool handleCatchLogSelect(AppState& state) {
  // Hal mentése a szákba
  state.fishCount++;
  state.totalWeightKg += state.catchTempWeightKg;
  if (state.activeKeepnetIndex == 0) {
    state.keepnet1Fish++;
    state.keepnet1WeightKg += state.catchTempWeightKg;
  } else {
    state.keepnet2Fish++;
    state.keepnet2WeightKg += state.catchTempWeightKg;
  }

  // BLE esemény küldése a mobilnak (súly grammban + fajta index + szák index)
  uint16_t grams = (uint16_t)(state.catchTempWeightKg * 1000.0f);
  uint8_t payload[4];
  payload[0] = (uint8_t)(grams & 0xFF);
  payload[1] = (uint8_t)((grams >> 8) & 0xFF);
  payload[2] = (uint8_t)state.catchSpeciesIndex;
  payload[3] = (uint8_t)state.activeKeepnetIndex;
  sendBleHardwareEvent(EVENT_CATCH_LOGGED, payload, 4);

  state.currentScreen = SCREEN_DASHBOARD;
  return true;
}

// =========================================================================
// 2. SZÁKTARTALOM & VERSENYLIMIT ŐR (`SCREEN_KEEPNET`)
// =========================================================================

void drawKeepnetScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_SUCCESS);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_SUCCESS, COLOR_HEADER_BG);
  tft->setCursor(8, 9);
  tft->print("SZAKTARTALOM & 20KG LIMIT OR");
  tft->setTextColor(COLOR_WHITE, COLOR_HEADER_BG);
  tft->setCursor(220, 9);
  tft->printf("OSSZ: %.1f kg", state.totalWeightKg);

  // Szák #1 Kártya
  tft->fillRoundRect(6, 32, 308, 66, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 32, 308, 66, 6, (state.activeKeepnetIndex == 0) ? COLOR_SUCCESS : 0x2965);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
  tft->setCursor(14, 40);
  tft->printf("SZAK #1 (Fo szak): %d db hal | %.1f / 20.0 kg", state.keepnet1Fish, state.keepnet1WeightKg);

  int k1Fill = (int)((state.keepnet1WeightKg / 20.0f) * 280);
  if (k1Fill > 280) k1Fill = 280;
  uint16_t k1Col = (state.keepnet1WeightKg >= 18.0f) ? COLOR_DANGER : ((state.keepnet1WeightKg >= 15.0f) ? COLOR_WARN : COLOR_SUCCESS);
  tft->fillRect(14, 58, 280, 8, 0x18C3);
  if (k1Fill > 0) tft->fillRect(14, 58, k1Fill, 8, k1Col);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 72);
  tft->printf("Telitettseg: %d%% | Szabad kapacitas: %.1f kg", (int)((state.keepnet1WeightKg / 20.0f) * 100), max(0.0f, 20.0f - state.keepnet1WeightKg));

  // Szák #2 Kártya
  tft->fillRoundRect(6, 104, 308, 66, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 104, 308, 66, 6, (state.activeKeepnetIndex == 1) ? COLOR_SUCCESS : 0x2965);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_ACCENT, COLOR_CARD_BG);
  tft->setCursor(14, 112);
  tft->printf("SZAK #2 (Tartalek szak): %d db hal | %.1f / 20.0 kg", state.keepnet2Fish, state.keepnet2WeightKg);

  int k2Fill = (int)((state.keepnet2WeightKg / 20.0f) * 280);
  if (k2Fill > 280) k2Fill = 280;
  tft->fillRect(14, 130, 280, 8, 0x18C3);
  if (k2Fill > 0) tft->fillRect(14, 130, k2Fill, 8, COLOR_ACCENT);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 144);
  tft->printf("Telitettseg: %d%% | Szabad kapacitas: %.1f kg", (int)((state.keepnet2WeightKg / 20.0f) * 100), max(0.0f, 20.0f - state.keepnet2WeightKg));

  // Alsó Segédsáv
  tft->fillRoundRect(6, 176, 308, 58, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 176, 308, 58, 6, 0x2965);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_WARN, COLOR_CARD_BG);
  tft->setCursor(14, 186);
  tft->print("[ROTARY NYOMAS]: Aktiv szak valtasa (#1 <-> #2)");
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 204);
  tft->print("[KO GOMB]: Visszateres a Fomenube");
}

bool handleKeepnetSelect(AppState& state) {
  state.activeKeepnetIndex = (state.activeKeepnetIndex == 0) ? 1 : 0;
  drawKeepnetScreen(state);
  return true;
}

// =========================================================================
// 3. ETETÉSI TÁVOLSÁG BEÁLLÍTÓ (`SCREEN_DISTANCE`)
// =========================================================================

void updateDistanceDigitsOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillRect(10, 50, 300, 80, COLOR_BG);

  char dStr[16];
  sprintf(dStr, "%d m", (int)state.tempDistanceM);
  tft->setTextSize(6);
  tft->setTextColor(COLOR_YELLOW, COLOR_BG);
  int len = strlen(dStr);
  int x = 160 - (len * 18);
  if (x < 14) x = 14;
  tft->setCursor(x, 66);
  tft->print(dStr);

  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(44, 142);
  float wraps = (float)state.tempDistanceM / 4.0f; // 4m távolságmérő pálca táv
  char wBuf[48];
  sprintf(wBuf, "(Kb. %.1f fordulat 4m-es tavolsagpalcan)   ", wraps);
  tft->print(wBuf);
}

void drawDistanceScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_YELLOW);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_YELLOW, COLOR_HEADER_BG);
  tft->setCursor(8, 9);
  tft->print("ETETESI TAVOLSAG BEALLITASA");

  tft->fillRoundRect(6, 32, 308, 136, 6, COLOR_CARD_BG);
  drawThickRoundRect(6, 32, 308, 136, 6, 3, COLOR_YELLOW);
  tft->fillRect(10, 48, 300, 84, COLOR_BG);

  tft->setTextSize(1);
  tft->setTextColor(COLOR_YELLOW, COLOR_CARD_BG);
  tft->setCursor(16, 38);
  tft->print("ZSINORKLIPSZELT PONTOS TAVOLSAG:");

  updateDistanceDigitsOnly(state);

  tft->fillRoundRect(6, 174, 308, 60, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 174, 308, 60, 6, 0x2965);

  tft->setTextSize(1);
  tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
  tft->setCursor(14, 184);
  tft->print("[ROTARY NYOMAS]: MENTES & ALKALMAZAS");
  tft->setTextColor(COLOR_WARN, COLOR_CARD_BG);
  tft->setCursor(14, 200);
  tft->print("[ROTARY TEKERES]: Tavolsag allitasa (+/- 1m)");
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 216);
  tft->print("[KO GOMB]: Megse / Visszalepes");
}

void handleDistanceRotary(int delta, AppState& state) {
  state.tempDistanceM += delta;
  if (state.tempDistanceM < 5) state.tempDistanceM = 5;
  if (state.tempDistanceM > 200) state.tempDistanceM = 200;
  updateDistanceDigitsOnly(state);
}

bool handleDistanceSelect(AppState& state) {
  state.targetDistanceM = state.tempDistanceM;
  state.currentScreen = SCREEN_DASHBOARD;
  return true;
}

// =========================================================================
// 4. SESSION STATISZTIKA (`SCREEN_SESSION_STATS`)
// =========================================================================

void drawSessionStatsScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, 0xC9BF);
  tft->setTextSize(1);
  tft->setTextColor(0xC9BF, COLOR_HEADER_BG);
  tft->setCursor(8, 9);
  tft->print("HORGASZAT TELJESITMENY & STATISZTIKA");

  // Statisztika Kártya
  tft->fillRoundRect(6, 32, 308, 136, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 32, 308, 136, 6, 0x2965);

  uint32_t sessionSec = (state.isSessionActive && state.sessionStartMs > 0) ? ((millis() - state.sessionStartMs) / 1000) : 0;
  uint32_t avgCastSec = (state.castCount > 0) ? (sessionSec / state.castCount) : 0;
  float catchRate = (state.castCount > 0) ? ((float)state.fishCount / (float)state.castCount * 100.0f) : 0.0f;

  tft->setTextSize(1);
  tft->setTextColor(COLOR_ACCENT, COLOR_CARD_BG);
  tft->setCursor(16, 42);
  tft->printf("Osszes Dobas:      #%d db", (int)state.castCount);
  tft->setCursor(170, 42);
  tft->printf("Ossz Suly:    %.1f kg", state.totalWeightKg);

  tft->setCursor(16, 64);
  tft->printf("Kifogott Halak:    %d db", (int)state.fishCount);
  tft->setCursor(170, 64);
  tft->printf("Kapasi Rata:  %.1f %%", catchRate);

  tft->setCursor(16, 86);
  tft->printf("Atlagos Dobasido:  %02d:%02d", (int)(avgCastSec / 60), (int)(avgCastSec % 60));
  tft->setCursor(170, 86);
  tft->printf("Session Ido:  %02d:%02d", (int)(sessionSec / 3600), (int)((sessionSec % 3600) / 60));

  tft->setCursor(16, 108);
  tft->printf("Etetesi Tavolsag:  %d m", (int)state.targetDistanceM);

  tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
  tft->setCursor(16, 132);
  tft->printf("Aktiv Celido Utem: [%s %02d:%02d]", getPreset(state.activePresetIndex).name, (int)(state.targetSeconds / 60), (int)(state.targetSeconds % 60));

  // Alsó Segédsáv
  tft->fillRoundRect(6, 174, 308, 60, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 174, 308, 60, 6, 0x2965);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 196);
  tft->print("[KO GOMB]: Visszateres a Fomenube");
}

// =========================================================================
// =========================================================================
// 5. ÚJ HORGÁSZAT SETUP & INDÍTÁS (`SCREEN_START_SESSION`)
// =========================================================================

void updateStartSessionFieldsOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  // 1. Botszám választó (Sor 1)
  tft->fillRect(10, 36, 300, 18, COLOR_CARD_BG);
  tft->setTextSize(1);
  tft->setTextColor((state.sessionSetupField == 0) ? COLOR_YELLOW : COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(16, 40);
  tft->printf("1. Botszam:       [ %s ]", (state.sessionSetupRodCount == 2) ? "2 BOT (DUAL SPLIT) 🎣" : "1 BOT (HERO STOPPER) 🎣");

  // 2. Bot #1 Ritmus (Sor 2)
  tft->fillRect(10, 56, 300, 18, COLOR_CARD_BG);
  tft->setTextColor((state.sessionSetupField == 1) ? COLOR_YELLOW : COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(16, 60);
  tft->printf("2. Bot #1 Ritmus: [ %s (%02d:%02d) ]", getPreset(state.sessionSetupPreset1).name, 
             (int)(getPreset(state.sessionSetupPreset1).targetSeconds / 60), (int)(getPreset(state.sessionSetupPreset1).targetSeconds % 60));

  // 3. Bot #2 Ritmus (Sor 3)
  tft->fillRect(10, 76, 300, 18, COLOR_CARD_BG);
  if (state.sessionSetupRodCount == 2) {
    tft->setTextColor((state.sessionSetupField == 2) ? COLOR_YELLOW : COLOR_WHITE, COLOR_CARD_BG);
    tft->setCursor(16, 80);
    tft->printf("3. Bot #2 Ritmus: [ %s (%02d:%02d) ]", getPreset(state.sessionSetupPreset2).name, 
               (int)(getPreset(state.sessionSetupPreset2).targetSeconds / 60), (int)(getPreset(state.sessionSetupPreset2).targetSeconds % 60));
  } else {
    tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
    tft->setCursor(16, 80);
    tft->print("3. Bot #2 Ritmus: [ INAKTIV - 1 BOTOS MOD ]");
  }

  // 4. Etetési távolság (Sor 4)
  tft->fillRect(10, 96, 300, 18, COLOR_CARD_BG);
  tft->setTextColor((state.sessionSetupField == 3) ? COLOR_YELLOW : COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(16, 100);
  tft->printf("4. Dobastavolsag: [ %d meter ]", state.sessionSetupDistanceM);

  // 5. Indítás Gomb (Sor 5)
  bool isLaunchSelected = (state.sessionSetupField == 4);
  uint16_t btnBg = isLaunchSelected ? COLOR_SUCCESS : COLOR_PANEL;
  uint16_t btnBorder = isLaunchSelected ? COLOR_YELLOW : COLOR_SUCCESS;
  uint16_t btnText = isLaunchSelected ? COLOR_BG : COLOR_WHITE;

  tft->fillRoundRect(16, 122, 288, 38, 6, btnBg);
  tft->drawRoundRect(16, 122, 288, 38, 6, btnBorder);
  tft->setTextSize(2);
  tft->setTextColor(btnText, btnBg);
  tft->setCursor(32, 134);
  tft->print("> HORGASZAT INDITASA <");
}

void drawStartSessionScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_SUCCESS);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_SUCCESS, COLOR_HEADER_BG);
  tft->setCursor(8, 9);
  tft->print("UJ HORGASZAT SETUP & INDITAS");

  tft->fillRoundRect(6, 30, 308, 144, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 30, 308, 144, 6, COLOR_SUCCESS);

  updateStartSessionFieldsOnly(state);

  // Alsó Segédsáv
  tft->fillRoundRect(6, 176, 308, 58, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 176, 308, 58, 6, 0x2965);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_WARN, COLOR_CARD_BG);
  tft->setCursor(14, 186);
  tft->print("[ROTARY]: Mezo valasztas | [SW]: Ertek valt / Indit");
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 204);
  tft->print("[KO GOMB]: Megse / Visszateres a Fomenube");
}

void handleStartSessionRotary(int delta, AppState& state) {
  int newField = (int)state.sessionSetupField + delta;
  if (newField < 0) newField = 0;
  if (newField > 4) newField = 4;
  if (state.sessionSetupRodCount == 1 && newField == 2) {
    newField = (delta > 0) ? 3 : 1;
  }
  if (newField != (int)state.sessionSetupField) {
    state.sessionSetupField = (uint8_t)newField;
    updateStartSessionFieldsOnly(state);
  }
}

bool handleStartSessionSelect(AppState& state) {
  int pCount = getPresetCount();
  switch (state.sessionSetupField) {
    case 0: // Botszám váltás
      state.sessionSetupRodCount = (state.sessionSetupRodCount == 1) ? 2 : 1;
      updateStartSessionFieldsOnly(state);
      break;

    case 1: // Bot 1 Ritmus léptetés
      state.sessionSetupPreset1 = (state.sessionSetupPreset1 + 1) % pCount;
      updateStartSessionFieldsOnly(state);
      break;

    case 2: // Bot 2 Ritmus léptetés (ha 2 botos)
      if (state.sessionSetupRodCount == 2) {
        state.sessionSetupPreset2 = (state.sessionSetupPreset2 + 1) % pCount;
        updateStartSessionFieldsOnly(state);
      }
      break;

    case 3: // Távolság léptetés (+5m, körbefordul 20m..120m)
      state.sessionSetupDistanceM += 5;
      if (state.sessionSetupDistanceM > 120) state.sessionSetupDistanceM = 20;
      updateStartSessionFieldsOnly(state);
      break;

    case 4: // HORGÁSZAT INDÍTÁSA!
      state.isSessionActive = true;
      state.sessionStartMs = millis();
      state.rodCount = state.sessionSetupRodCount;
      state.selectedRodIndex = 0;

      // Bot #1 beállítása
      state.rods[0].activePresetIndex = state.sessionSetupPreset1;
      state.rods[0].targetSeconds = getPreset(state.sessionSetupPreset1).targetSeconds;
      state.rods[0].currentDistanceM = state.sessionSetupDistanceM;
      state.rods[0].elapsedSec = 0;
      state.rods[0].castCount = 0;
      state.rods[0].isTimerRunning = false;
      state.rods[0].isOvertime = false;

      // Bot #2 beállítása
      state.rods[1].activePresetIndex = state.sessionSetupPreset2;
      state.rods[1].targetSeconds = getPreset(state.sessionSetupPreset2).targetSeconds;
      state.rods[1].currentDistanceM = state.sessionSetupDistanceM;
      state.rods[1].elapsedSec = 0;
      state.rods[1].castCount = 0;
      state.rods[1].isTimerRunning = false;
      state.rods[1].isOvertime = false;

      // Globális mezők szinkronizálása
      state.activePresetIndex = state.rods[0].activePresetIndex;
      state.targetSeconds = state.rods[0].targetSeconds;
      state.targetDistanceM = state.sessionSetupDistanceM;
      state.tempDistanceM = state.sessionSetupDistanceM;
      state.castCount = 0;
      state.fishCount = 0;
      state.totalWeightKg = 0.0f;
      state.keepnet1Fish = 0;
      state.keepnet1WeightKg = 0.0f;
      state.keepnet2Fish = 0;
      state.keepnet2WeightKg = 0.0f;
      state.isTimerRunning = false;
      state.isOvertime = false;
      state.elapsedSec = 0;

      state.currentScreen = SCREEN_DASHBOARD;
      drawDashboardScreen(state);
      Serial.printf("🎣 [SESSION START] Horgaszat elinditva! Botszam: %d, Tav: %d m, Bot1: %s, Bot2: %s\n",
                    state.rodCount, state.targetDistanceM, 
                    getPreset(state.rods[0].activePresetIndex).name,
                    getPreset(state.rods[1].activePresetIndex).name);
  }
  return true;
}

// =========================================================================
// 6. RENDSZER BEÁLLÍTÁSOK (`SCREEN_SETTINGS`)
// =========================================================================

void updateSettingsItemsOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->setTextWrap(false);
  tft->setTextSize(1);

  // 1. Kijelző Fényerő
  tft->fillRect(10, 36, 300, 20, COLOR_CARD_BG);
  tft->setTextColor((state.selectedSettingIndex == 0) ? COLOR_YELLOW : COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(16, 40);
  tft->printf("1. Kijelzo Fenyero:       [ %d %% ]", state.brightnessLevel * 20);

  // 2. Stopper Irány
  tft->fillRect(10, 60, 300, 20, COLOR_CARD_BG);
  tft->setTextColor((state.selectedSettingIndex == 1) ? COLOR_YELLOW : COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(16, 64);
  tft->printf("2. Stopper Irany:         [ %s ]", state.isCountdownMode ? "VISSZASZAMLALO ⏳" : "ELORESZAMLALO ⏱️");

  // 3. Hangjelzés (Buzzer)
  tft->fillRect(10, 84, 300, 20, COLOR_CARD_BG);
  tft->setTextColor((state.selectedSettingIndex == 2) ? COLOR_YELLOW : COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(16, 88);
  tft->printf("3. Hangjelzes (Buzzer):   [ %s ]", state.buzzerEnabled ? "BEKAPCSOLVA 🔊" : "KIKAPCSOLVA 🔇");

  // 4. Riasztó LED
  tft->fillRect(10, 108, 300, 20, COLOR_CARD_BG);
  tft->setTextColor((state.selectedSettingIndex == 3) ? COLOR_YELLOW : COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(16, 112);
  tft->printf("4. Riaszto LED:           [ %s ]", state.ledAlertEnabled ? "BEKAPCSOLVA 💡" : "KIKAPCSOLVA ✖");

  // 5. Pontos Óra Kézi Beállítása
  uint32_t currentSec = (state.rtcBaseEpochSec + (millis() - state.rtcBootMs) / 1000) % 86400;
  tft->fillRect(10, 132, 300, 20, COLOR_CARD_BG);
  tft->setTextColor((state.selectedSettingIndex == 4) ? COLOR_YELLOW : COLOR_ACCENT, COLOR_CARD_BG);
  tft->setCursor(16, 136);
  tft->printf("5. Pontos Ora Beallitasa: [ %02d:%02d > ]", (int)(currentSec / 3600), (int)((currentSec % 3600) / 60));
}

void drawSettingsScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_TEXT_MUTED);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_WHITE, COLOR_HEADER_BG);
  tft->setCursor(8, 9);
  tft->print("RENDSZER BEALLITASOK");

  tft->fillRoundRect(6, 30, 308, 140, 6, COLOR_CARD_BG);
  drawThickRoundRect(6, 30, 308, 140, 6, 2, COLOR_BORDER_SUBTLE);

  updateSettingsItemsOnly(state);

  // Alsó Segédsáv
  tft->fillRoundRect(6, 174, 308, 60, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 174, 308, 60, 6, 0x2965);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_WARN, COLOR_CARD_BG);
  tft->setCursor(14, 186);
  tft->print("[ROTARY NYOMAS]: Kivalasztas / Modositas");
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 204);
  tft->print("[KO GOMB]: Visszateres a Fomenube");
}

void handleSettingsRotary(int delta, AppState& state) {
  int newIndex = state.selectedSettingIndex + delta;
  if (newIndex < 0) newIndex = 0;
  if (newIndex > 4) newIndex = 4;
  if (newIndex != state.selectedSettingIndex) {
    state.selectedSettingIndex = newIndex;
    updateSettingsItemsOnly(state);
  }
}

bool handleSettingsSelect(AppState& state) {
  if (state.selectedSettingIndex == 0) {
    state.brightnessLevel = (state.brightnessLevel % 5) + 1;
    updateSettingsItemsOnly(state);
  } else if (state.selectedSettingIndex == 1) {
    state.isCountdownMode = !state.isCountdownMode;
    updateSettingsItemsOnly(state);
  } else if (state.selectedSettingIndex == 2) {
    state.buzzerEnabled = !state.buzzerEnabled;
    updateSettingsItemsOnly(state);
  } else if (state.selectedSettingIndex == 3) {
    state.ledAlertEnabled = !state.ledAlertEnabled;
    updateSettingsItemsOnly(state);
  } else if (state.selectedSettingIndex == 4) {
    // Kézi Óra Beállító Képernyő Megnyitása
    uint32_t currentSec = (state.rtcBaseEpochSec + (millis() - state.rtcBootMs) / 1000) % 86400;
    state.tempClockHour = (uint8_t)(currentSec / 3600);
    state.tempClockMinute = (uint8_t)((currentSec % 3600) / 60);
    state.clockSettingStep = 0; // 0 = Óra állítás
    state.currentScreen = SCREEN_TIME_SETTINGS;
    drawTimeSettingsScreen(state);
  }
  return true;
}

// =========================================================================
// 7. KÉZI PONTOS ÓRA BEÁLLÍTÓ (`SCREEN_TIME_SETTINGS`)
// =========================================================================

void updateTimeSettingsDigitsOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  // Lépésjelző felirat
  tft->fillRect(20, 48, 280, 20, COLOR_CARD_BG);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_YELLOW, COLOR_CARD_BG);
  tft->setCursor(44, 52);
  if (state.clockSettingStep == 0) {
    tft->print("▲ [ 1/2 LEPES: ORA ALLITASA (00-23) ] ▲");
  } else {
    tft->print("▲ [ 2/2 LEPES: PERC ALLITASA (00-59) ] ▲");
  }

  // Nagy Óra : Perc számok (Size 5)
  // Óra rész (HH)
  tft->setTextSize(5);
  tft->setTextColor((state.clockSettingStep == 0) ? COLOR_YELLOW : COLOR_WHITE, COLOR_BG);
  tft->setCursor(85, 84);
  tft->printf("%02d", state.tempClockHour);

  // Kettőspont (:)
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_BG);
  tft->setCursor(148, 84);
  tft->print(":");

  // Perc rész (MM)
  tft->setTextColor((state.clockSettingStep == 1) ? COLOR_YELLOW : COLOR_WHITE, COLOR_BG);
  tft->setCursor(178, 84);
  tft->printf("%02d", state.tempClockMinute);
}

void drawTimeSettingsScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_ACCENT);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_ACCENT, COLOR_HEADER_BG);
  tft->setCursor(8, 9);
  tft->print("PONTOS IDO BEALLITASA");

  // Központi Kártya
  tft->fillRoundRect(6, 32, 308, 134, 6, COLOR_CARD_BG);
  drawThickRoundRect(6, 32, 308, 134, 6, 2, COLOR_ACCENT);
  tft->fillRect(14, 76, 292, 60, COLOR_BG);

  updateTimeSettingsDigitsOnly(state);

  // Alsó Segédsáv
  tft->fillRoundRect(6, 172, 308, 62, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 172, 308, 62, 6, 0x2965);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_WARN, COLOR_CARD_BG);
  tft->setCursor(14, 182);
  tft->print("[ROTARY TEKERES]: Ertek novelese / csokkentese");
  tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
  tft->setCursor(14, 198);
  tft->print(state.clockSettingStep == 0 ? "[ROTARY NYOMAS]: Tovabb a Perc allitasara >" : "[ROTARY NYOMAS]: MENTES & ALKALMAZAS ✓");
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 214);
  tft->print("[KO GOMB]: Megse / Visszalepes");
}

void handleTimeSettingsRotary(int delta, AppState& state) {
  if (state.clockSettingStep == 0) {
    int h = (int)state.tempClockHour + delta;
    if (h < 0) h = 23;
    if (h > 23) h = 0;
    state.tempClockHour = (uint8_t)h;
  } else {
    int m = (int)state.tempClockMinute + delta;
    if (m < 0) m = 59;
    if (m > 59) m = 0;
    state.tempClockMinute = (uint8_t)m;
  }
  updateTimeSettingsDigitsOnly(state);
}

bool handleTimeSettingsSelect(AppState& state) {
  if (state.clockSettingStep == 0) {
    state.clockSettingStep = 1; // Átlépés a percre
    drawTimeSettingsScreen(state);
  } else {
    // Mentés és alkalmazás
    uint32_t currentSec = ((uint32_t)state.tempClockHour * 3600) + ((uint32_t)state.tempClockMinute * 60);
    state.rtcBaseEpochSec = currentSec;
    state.rtcBootMs = millis();
    Serial.printf("🕒 [ORA MENTVE] Pontos ido beallitva: %02d:%02d\n", state.tempClockHour, state.tempClockMinute);

    state.currentScreen = SCREEN_SETTINGS;
    drawSettingsScreen(state);
  }
  return true;
}

