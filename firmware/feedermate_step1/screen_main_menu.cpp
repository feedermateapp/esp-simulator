#include "screen_main_menu.h"

static const int VISIBLE_MAIN_MENU_COUNT = 3;

static int getMainMenuTopIndex(int selectedIndex) {
  int top = selectedIndex - 1;
  int mainCount = getMainMenuCount();
  if (top < 0) top = 0;
  if (top > mainCount - VISIBLE_MAIN_MENU_COUNT) {
    top = mainCount - VISIBLE_MAIN_MENU_COUNT;
  }
  return top;
}

static void renderMainMenuRow(int slot, int itemIndex, bool isSelected) {
  Adafruit_ST7789* tft = getTft();
  int mainCount = getMainMenuCount();
  if (!tft || itemIndex < 0 || itemIndex >= mainCount) return;
  
  int startY = 32;
  int itemHeight = 57;
  int y = startY + (slot * itemHeight);
  const MainMenuItem& item = getMainMenuItem(itemIndex);

  uint16_t bgColor = isSelected ? COLOR_SELECTED_BG : COLOR_CARD_BG;
  uint16_t borderColor = isSelected ? COLOR_YELLOW : COLOR_BORDER_SUBTLE;

  tft->fillRoundRect(6, y, 300, itemHeight - 5, 8, bgColor);
  if (isSelected) {
    drawThickRoundRect(6, y, 300, itemHeight - 5, 8, 2, COLOR_YELLOW);
  } else {
    drawThickRoundRect(6, y, 300, itemHeight - 5, 8, 2, borderColor);
  }

  tft->setTextWrap(false);

  // Bal oldali ikon / sorszám jelző
  tft->setTextSize(2);
  if (isSelected) {
    tft->setTextColor(COLOR_YELLOW, bgColor);
    tft->setCursor(12, y + 10);
    tft->print(">");
  } else {
    tft->setTextColor(COLOR_TEXT_MUTED, bgColor);
    tft->setCursor(12, y + 10);
    tft->print(" ");
  }

  // Főcím (Size 2)
  tft->setTextColor(isSelected ? COLOR_WHITE : item.iconColor, bgColor);
  tft->setCursor(30, y + 10);
  tft->print(item.title);

  // Alcím (Size 1)
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, bgColor);
  tft->setCursor(30, y + 32);
  tft->print(item.subtitle);
}

static void renderMainMenuScrollbar(int selectedIndex) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;
  int mainCount = getMainMenuCount();
  int trackX = 312;
  int trackY = 32;
  int trackW = 4;
  int trackH = 168;
  
  tft->fillRoundRect(trackX, trackY, trackW, trackH, 2, COLOR_PANEL);
  
  int thumbH = (VISIBLE_MAIN_MENU_COUNT * trackH) / mainCount;
  int topIndex = getMainMenuTopIndex(selectedIndex);
  int maxTop = mainCount - VISIBLE_MAIN_MENU_COUNT;
  int thumbY = (maxTop > 0) ? (trackY + (topIndex * (trackH - thumbH)) / maxTop) : trackY;
  
  tft->fillRoundRect(trackX, thumbY, trackW, thumbH, 2, COLOR_YELLOW);
}

void drawMainMenuScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;
  int mainCount = getMainMenuCount();

  tft->fillScreen(COLOR_BG);

  // Fejléc
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_YELLOW, COLOR_HEADER_BG);
  tft->setCursor(10, 9);
  tft->print("FEEDERMATE FOMENU");
  
  // Pill badge a jobb oldalon
  tft->fillRoundRect(228, 4, 86, 18, 9, COLOR_PANEL);
  tft->drawRoundRect(228, 4, 86, 18, 9, COLOR_BORDER_SUBTLE);
  tft->setTextColor(COLOR_WHITE, COLOR_PANEL);
  tft->setCursor(236, 9);
  tft->printf("[%d/%d ELEM]", state.selectedMainMenuIndex + 1, mainCount);

  int topIndex = getMainMenuTopIndex(state.selectedMainMenuIndex);
  for (int slot = 0; slot < VISIBLE_MAIN_MENU_COUNT; slot++) {
    int itemIdx = topIndex + slot;
    renderMainMenuRow(slot, itemIdx, itemIdx == state.selectedMainMenuIndex);
  }

  renderMainMenuScrollbar(state.selectedMainMenuIndex);

  // Alsó Segédsáv
  tft->fillRect(0, 212, 320, 28, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 212, 320, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_HEADER_BG);
  tft->setCursor(14, 220);
  tft->print("[ROTARY]: Gorget | [PUSH]: Kivalaszt | [KO]: Vissza");
}

void handleMainMenuRotary(int delta, AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;
  int mainCount = getMainMenuCount();
  int prevSelected = state.selectedMainMenuIndex;
  state.selectedMainMenuIndex += delta;
  if (state.selectedMainMenuIndex < 0) state.selectedMainMenuIndex = 0;
  if (state.selectedMainMenuIndex >= mainCount) state.selectedMainMenuIndex = mainCount - 1;

  if (prevSelected != state.selectedMainMenuIndex) {
    int prevTop = getMainMenuTopIndex(prevSelected);
    int newTop = getMainMenuTopIndex(state.selectedMainMenuIndex);

    if (prevTop != newTop) {
      // Simított ablakgörgetés: NEM töröljük a teljes képernyőt, csak a 3 kártyát rajzoljuk újra helyben!
      for (int slot = 0; slot < VISIBLE_MAIN_MENU_COUNT; slot++) {
        int itemIdx = newTop + slot;
        renderMainMenuRow(slot, itemIdx, itemIdx == state.selectedMainMenuIndex);
      }
    } else {
      renderMainMenuRow(prevSelected - newTop, prevSelected, false);
      renderMainMenuRow(state.selectedMainMenuIndex - newTop, state.selectedMainMenuIndex, true);
    }

    renderMainMenuScrollbar(state.selectedMainMenuIndex);
    
    // Fejléc pill frissítése
    tft->fillRoundRect(228, 4, 86, 18, 9, COLOR_PANEL);
    tft->drawRoundRect(228, 4, 86, 18, 9, COLOR_BORDER_SUBTLE);
    tft->setTextSize(1);
    tft->setTextColor(COLOR_WHITE, COLOR_PANEL);
    tft->setCursor(236, 9);
    tft->printf("[%d/%d ELEM]", state.selectedMainMenuIndex + 1, mainCount);
  }
}

bool handleMainMenuSelect(AppState& state) {
  const MainMenuItem& selected = getMainMenuItem(state.selectedMainMenuIndex);
  if (selected.targetScreen == SCREEN_CATCH_LOG) {
    state.catchTempWeightKg = getSpecies(state.catchSpeciesIndex).defaultWeightKg;
  } else if (selected.targetScreen == SCREEN_DISTANCE) {
    state.tempDistanceM = state.targetDistanceM;
  } else if (selected.targetScreen == SCREEN_START_SESSION) {
    state.sessionSetupField = 0;
    state.sessionSetupRodCount = state.rodCount;
    state.sessionSetupPreset1 = state.rods[0].activePresetIndex;
    state.sessionSetupPreset2 = state.rods[1].activePresetIndex;
    state.sessionSetupDistanceM = (state.targetDistanceM > 0) ? state.targetDistanceM : 65;
  }
  state.currentScreen = selected.targetScreen;
  return true;
}

