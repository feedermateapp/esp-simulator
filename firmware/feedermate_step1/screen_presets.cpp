#include "screen_presets.h"
#include "screen_dashboard.h"
#include "screen_subscreens.h"

static const int VISIBLE_PRESET_COUNT = 3;

static int getPresetTopIndex(int selectedIndex, int totalCount) {
  int top = selectedIndex - 1;
  if (top < 0) top = 0;
  if (top > totalCount - VISIBLE_PRESET_COUNT) {
    top = totalCount - VISIBLE_PRESET_COUNT;
  }
  if (top < 0) top = 0;
  return top;
}

static void renderPresetRow(int slot, int itemIndex, bool isSelected, bool isActive, uint8_t tab) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;
  
  int startY = 52;
  int itemHeight = 52;
  int y = startY + (slot * itemHeight);

  uint16_t bgColor = isSelected ? COLOR_SELECTED_BG : COLOR_CARD_BG;
  uint16_t borderColor = isSelected ? COLOR_YELLOW : (isActive ? COLOR_SUCCESS : COLOR_BORDER_SUBTLE);

  tft->fillRoundRect(6, y, 300, itemHeight - 5, 8, bgColor);
  drawThickRoundRect(6, y, 300, itemHeight - 5, 8, 2, borderColor);

  tft->setTextWrap(false);

  // Kijelölő / Aktív nyíl
  tft->setTextSize(2);
  if (isSelected) {
    tft->setTextColor(COLOR_YELLOW, bgColor);
    tft->setCursor(12, y + 8);
    tft->print(">");
  } else {
    tft->setTextColor(COLOR_TEXT_MUTED, bgColor);
    tft->setCursor(12, y + 8);
    tft->print(isActive ? "*" : " ");
  }

  if (tab == 0) {
    // -----------------------------------------------------------------
    // IDŐ RITMUS PRESET
    // -----------------------------------------------------------------
    const PresetItem& item = getPreset(itemIndex);
    tft->setTextColor(isSelected ? COLOR_WHITE : (isActive ? COLOR_SUCCESS : COLOR_WHITE), bgColor);
    tft->setCursor(30, y + 8);
    tft->print(item.name);

    // Jobb oldali Badge (Size 2)
    char timeBadge[12];
    if (itemIndex == getPresetCount() - 1) {
      sprintf(timeBadge, "CUSTOM");
    } else {
      sprintf(timeBadge, "%02d:%02d", (int)(item.targetSeconds / 60), (int)(item.targetSeconds % 60));
    }
    tft->setTextColor(item.badgeColor, bgColor);
    tft->setCursor(215, y + 8);
    tft->print(timeBadge);

    // Alcím (Size 1)
    tft->setTextSize(1);
    tft->setTextColor(COLOR_TEXT_MUTED, bgColor);
    tft->setCursor(30, y + 30);
    tft->print(item.description);

  } else {
    // -----------------------------------------------------------------
    // TÁVOLSÁG PRESET
    // -----------------------------------------------------------------
    const DistancePresetItem& item = getDistancePreset(itemIndex);
    tft->setTextColor(isSelected ? COLOR_WHITE : (isActive ? COLOR_SUCCESS : COLOR_WHITE), bgColor);
    tft->setCursor(30, y + 8);
    tft->print(item.name);

    // Jobb oldali Badge (Size 2)
    char distBadge[12];
    if (itemIndex == getDistancePresetCount() - 1) {
      sprintf(distBadge, "EGYEDI");
    } else {
      sprintf(distBadge, "%3d m", item.distanceM);
    }
    tft->setTextColor(item.badgeColor, bgColor);
    tft->setCursor(215, y + 8);
    tft->print(distBadge);

    // Alcím (Size 1)
    tft->setTextSize(1);
    tft->setTextColor(COLOR_TEXT_MUTED, bgColor);
    tft->setCursor(30, y + 30);
    tft->print(item.description);
  }
}

static void renderPresetScrollbar(int selectedIndex, int totalCount) {
  Adafruit_ST7789* tft = getTft();
  if (!tft || totalCount <= 0) return;
  int trackX = 312;
  int trackY = 52;
  int trackW = 4;
  int trackH = 152;
  
  tft->fillRoundRect(trackX, trackY, trackW, trackH, 2, COLOR_PANEL);
  
  int thumbH = (VISIBLE_PRESET_COUNT * trackH) / totalCount;
  if (thumbH < 20) thumbH = 20;
  int topIndex = getPresetTopIndex(selectedIndex, totalCount);
  int maxTop = totalCount - VISIBLE_PRESET_COUNT;
  int thumbY = (maxTop > 0) ? (trackY + (topIndex * (trackH - thumbH)) / maxTop) : trackY;
  
  tft->fillRoundRect(trackX, thumbY, trackW, thumbH, 2, COLOR_YELLOW);
}

void updatePresetTabHeaderOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  // Tab 0: IDŐ RITMUS
  bool isTab0 = (state.presetTab == 0);
  tft->fillRoundRect(6, 28, 150, 20, 5, isTab0 ? COLOR_ACCENT : COLOR_PANEL);
  tft->drawRoundRect(6, 28, 150, 20, 5, isTab0 ? COLOR_YELLOW : COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(isTab0 ? COLOR_WHITE : COLOR_TEXT_MUTED, isTab0 ? COLOR_ACCENT : COLOR_PANEL);
  tft->setCursor(18, 34);
  tft->print("1. IDO RITMUS (6)");

  // Tab 1: TÁVOLSÁG
  bool isTab1 = (state.presetTab == 1);
  tft->fillRoundRect(160, 28, 150, 20, 5, isTab1 ? COLOR_YELLOW : COLOR_PANEL);
  tft->drawRoundRect(160, 28, 150, 20, 5, isTab1 ? COLOR_WHITE : COLOR_BORDER_SUBTLE);
  tft->setTextColor(isTab1 ? COLOR_BG : COLOR_TEXT_MUTED, isTab1 ? COLOR_YELLOW : COLOR_PANEL);
  tft->setCursor(174, 34);
  tft->print("2. TAVOLSAG (7)");
}

void drawPresetMenuScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);

  // 1. Fejléc
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_YELLOW, COLOR_HEADER_BG);
  tft->setCursor(10, 9);
  tft->printf("TAKTIKAI PRESETEK (BOT #%d)", state.selectedRodIndex + 1);
  
  // Pill badge a jobb oldalon
  tft->fillRoundRect(204, 4, 110, 18, 9, COLOR_PANEL);
  tft->drawRoundRect(204, 4, 110, 18, 9, COLOR_BORDER_SUBTLE);
  tft->setTextColor(COLOR_WHITE, COLOR_PANEL);
  tft->setCursor(212, 9);
  tft->print("[D33: FULVALTAS]");

  // 2. Fülválasztó sáv
  updatePresetTabHeaderOnly(state);

  // 3. Sorok kirajzolása
  int totalCount = (state.presetTab == 0) ? getPresetCount() : getDistancePresetCount();
  int selIdx = (state.presetTab == 0) ? state.selectedPresetIndex : state.selectedDistancePresetIndex;
  int topIndex = getPresetTopIndex(selIdx, totalCount);

  for (int slot = 0; slot < VISIBLE_PRESET_COUNT; slot++) {
    int itemIdx = topIndex + slot;
    if (itemIdx < totalCount) {
      bool isSel = (itemIdx == selIdx);
      bool isAct = false;
      if (state.presetTab == 0) {
        isAct = (itemIdx == state.rods[state.selectedRodIndex].activePresetIndex);
      } else {
        isAct = (getDistancePreset(itemIdx).distanceM == state.rods[state.selectedRodIndex].currentDistanceM);
      }
      renderPresetRow(slot, itemIdx, isSel, isAct, state.presetTab);
    }
  }

  renderPresetScrollbar(selIdx, totalCount);

  // 4. Alsó Segédsáv
  tft->fillRect(0, 212, 320, 28, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 212, 320, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_HEADER_BG);
  tft->setCursor(10, 220);
  tft->print("[ROTARY]: Gorget | [PUSH]: Kivalaszt | [KO]: Vissza");
}

void handlePresetMenuRotary(int delta, AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  int totalCount = (state.presetTab == 0) ? getPresetCount() : getDistancePresetCount();
  int* pSel = (state.presetTab == 0) ? &state.selectedPresetIndex : &state.selectedDistancePresetIndex;
  
  int prevSelected = *pSel;
  int nextSelected = prevSelected + delta;
  if (nextSelected < 0) nextSelected = 0;
  if (nextSelected >= totalCount) nextSelected = totalCount - 1;
  *pSel = nextSelected;

  if (prevSelected != *pSel) {
    int prevTop = getPresetTopIndex(prevSelected, totalCount);
    int newTop = getPresetTopIndex(*pSel, totalCount);

    if (prevTop != newTop) {
      for (int slot = 0; slot < VISIBLE_PRESET_COUNT; slot++) {
        int itemIdx = newTop + slot;
        if (itemIdx < totalCount) {
          bool isSel = (itemIdx == *pSel);
          bool isAct = (state.presetTab == 0) ? (itemIdx == state.rods[state.selectedRodIndex].activePresetIndex) :
                       (getDistancePreset(itemIdx).distanceM == state.rods[state.selectedRodIndex].currentDistanceM);
          renderPresetRow(slot, itemIdx, isSel, isAct, state.presetTab);
        }
      }
    } else {
      bool prevAct = (state.presetTab == 0) ? (prevSelected == state.rods[state.selectedRodIndex].activePresetIndex) :
                     (getDistancePreset(prevSelected).distanceM == state.rods[state.selectedRodIndex].currentDistanceM);
      bool currAct = (state.presetTab == 0) ? (*pSel == state.rods[state.selectedRodIndex].activePresetIndex) :
                     (getDistancePreset(*pSel).distanceM == state.rods[state.selectedRodIndex].currentDistanceM);
      renderPresetRow(prevSelected - newTop, prevSelected, false, prevAct, state.presetTab);
      renderPresetRow(*pSel - newTop, *pSel, true, currAct, state.presetTab);
    }

    renderPresetScrollbar(*pSel, totalCount);
  }
}

bool handlePresetMenuSelect(AppState& state) {
  RodState& rod = state.rods[state.selectedRodIndex];

  if (state.presetTab == 0) {
    // -------------------------------------------------------------
    // IDŐ RITMUS KIVÁLASZTÁSA
    // -------------------------------------------------------------
    int customIndex = getPresetCount() - 1;
    if (state.selectedPresetIndex == customIndex) {
      state.customTempSeconds = (rod.customTempSeconds > 0) ? rod.customTempSeconds : rod.targetSeconds;
      state.currentScreen = SCREEN_CUSTOM_TIME;
      drawCustomTimeScreen(state);
      return true;
    } else {
      rod.activePresetIndex = state.selectedPresetIndex;
      rod.targetSeconds = getPreset(rod.activePresetIndex).targetSeconds;
      if (!rod.isTimerRunning) {
        rod.elapsedSec = 0;
        rod.isOvertime = false;
      }
      state.activePresetIndex = rod.activePresetIndex;
      state.targetSeconds = rod.targetSeconds;
      state.currentScreen = SCREEN_DASHBOARD;
      drawDashboardScreen(state);
      Serial.printf("⏱️ [PRESET IDO] Bot #%d ritmus beallitva: %s (%lu mp)\n", 
                    state.selectedRodIndex + 1, getPreset(rod.activePresetIndex).name, (unsigned long)rod.targetSeconds);
      return true;
    }
  } else {
    // -------------------------------------------------------------
    // TÁVOLSÁG KIVÁLASZTÁSA
    // -------------------------------------------------------------
    int customDistIndex = getDistancePresetCount() - 1;
    if (state.selectedDistancePresetIndex == customDistIndex) {
      state.tempDistanceM = (rod.currentDistanceM > 0) ? rod.currentDistanceM : 65;
      state.currentScreen = SCREEN_DISTANCE;
      drawDistanceScreen(state);
      return true;
    } else {
      rod.currentDistanceM = getDistancePreset(state.selectedDistancePresetIndex).distanceM;
      state.targetDistanceM = rod.currentDistanceM;
      state.tempDistanceM = rod.currentDistanceM;
      state.currentScreen = SCREEN_DASHBOARD;
      drawDashboardScreen(state);
      Serial.printf("📏 [PRESET TAV] Bot #%d tavolsag beallitva: %d meter\n", 
                    state.selectedRodIndex + 1, rod.currentDistanceM);
      return true;
    }
  }
}

void updateCustomTimeDigitsOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;
  char cTimeStr[16];
  sprintf(cTimeStr, " %02d:%02d ", (int)(state.customTempSeconds / 60), (int)(state.customTempSeconds % 60));
  tft->setTextSize(6);
  tft->setTextColor(COLOR_YELLOW, COLOR_BG);
  tft->setCursor(34, 78);
  tft->print(cTimeStr);

  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(110, 140);
  char secBuf[32];
  sprintf(secBuf, "(%d masodperc)   ", (int)state.customTempSeconds);
  tft->print(secBuf);
}

void drawCustomTimeScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_YELLOW, COLOR_HEADER_BG);
  tft->setCursor(10, 9);
  tft->print("EGYENI CELIDO BEALLITASA");

  tft->fillRoundRect(6, 32, 308, 136, 8, COLOR_CARD_BG);
  drawThickRoundRect(6, 32, 308, 136, 8, 2, COLOR_YELLOW);
  tft->fillRect(10, 48, 300, 84, COLOR_BG);

  tft->setTextSize(1);
  tft->setTextColor(COLOR_YELLOW, COLOR_CARD_BG);
  tft->setCursor(16, 38);
  tft->print("BEALLITOTT CELIDO (ROTARYVAL ALLITHATO):");

  updateCustomTimeDigitsOnly(state);

  tft->fillRoundRect(6, 174, 308, 60, 8, COLOR_CARD_BG);
  tft->drawRoundRect(6, 174, 308, 60, 8, COLOR_BORDER_SUBTLE);

  tft->setTextSize(1);
  tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
  tft->setCursor(14, 184);
  tft->print("[ROTARY NYOMAS]: MENTES & INDITAS");
  tft->setTextColor(COLOR_WARN, COLOR_CARD_BG);
  tft->setCursor(14, 200);
  tft->print("[ROTARY TEKERES]: Celido allitasa (+/- 5 mp)");
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 216);
  tft->print("[KO GOMB]: Megse / Visszalepes");
}

void handleCustomTimeRotary(int delta, AppState& state) {
  state.customTempSeconds += (delta * 5);
  if (state.customTempSeconds < 5) state.customTempSeconds = 5;
  if (state.customTempSeconds > 7200) state.customTempSeconds = 7200;
  updateCustomTimeDigitsOnly(state);
}

bool handleCustomTimeSelect(AppState& state) {
  RodState& rod = state.rods[state.selectedRodIndex];
  rod.activePresetIndex = getPresetCount() - 1; // Custom
  rod.customTempSeconds = state.customTempSeconds;
  rod.targetSeconds = state.customTempSeconds;
  if (!rod.isTimerRunning) {
    rod.elapsedSec = 0;
    rod.isOvertime = false;
  }
  state.activePresetIndex = rod.activePresetIndex;
  state.targetSeconds = rod.targetSeconds;
  state.currentScreen = SCREEN_DASHBOARD;
  drawDashboardScreen(state);
  return true;
}
