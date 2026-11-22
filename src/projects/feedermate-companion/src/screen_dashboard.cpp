#include "screen_dashboard.h"

// =========================================================================
// FeederMate Smart Companion – Smooth Pro Dashboard Modul (1 és 2 Bot)
// =========================================================================

void updateHeaderOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  // Fejléc alap sáv
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_BORDER_SUBTLE);

  // Bal oldal: Aktív profil badge
  char badgeBuf[32];
  if (state.rodCount == 2) {
    const RodState& activeRod = state.rods[state.selectedRodIndex];
    const PresetItem& activePreset = getPreset(activeRod.activePresetIndex);
    sprintf(badgeBuf, "B#%d: %s %02d:%02d", state.selectedRodIndex + 1, activePreset.name, 
            (int)(activeRod.targetSeconds / 60), (int)(activeRod.targetSeconds % 60));
  } else {
    const PresetItem& activePreset = getPreset(state.activePresetIndex);
    sprintf(badgeBuf, "%s %02d:%02d", activePreset.name, 
            (int)(state.targetSeconds / 60), (int)(state.targetSeconds % 60));
  }
  
  tft->fillRoundRect(6, 4, 150, 18, 9, COLOR_PANEL);
  tft->drawRoundRect(6, 4, 150, 18, 9, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_ACCENT, COLOR_PANEL);
  tft->setCursor(14, 9);
  tft->print(badgeBuf);

  // Középső rész: BLE Kapcsolat Státusz Badge
  if (state.isBleConnected) {
    tft->fillRoundRect(164, 4, 56, 18, 9, COLOR_ACCENT);
    tft->setTextSize(1);
    tft->setTextColor(COLOR_WHITE, COLOR_ACCENT);
    tft->setCursor(172, 9);
    tft->print("BLE ON");
  } else {
    tft->fillRoundRect(164, 4, 56, 18, 9, COLOR_PANEL);
    tft->drawRoundRect(164, 4, 56, 18, 9, COLOR_BORDER_SUBTLE);
    tft->setTextSize(1);
    tft->setTextColor(COLOR_TEXT_MUTED, COLOR_PANEL);
    tft->setCursor(168, 9);
    tft->print("BLE ADV");
  }

  // Jobb oldal: Aktuális Pontos Idő (Letisztult HH:MM kijelzés)
  uint32_t currentSec = (state.rtcBaseEpochSec + (millis() - state.rtcBootMs) / 1000) % 86400;
  char timeClockBuf[16];
  sprintf(timeClockBuf, "%02d:%02d", (int)(currentSec / 3600), (int)((currentSec % 3600) / 60));

  tft->setTextSize(1);
  tft->setTextColor(COLOR_WHITE, COLOR_HEADER_BG);
  tft->setCursor(276, 9);
  tft->print(timeClockBuf);
}

void updateHeroCardBorderOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  if (state.rodCount == 2) {
    // Bot #1 Keret (Felső) - Csak az aktív bot sárga, az inaktív finom szürkéskék keretű
    uint16_t b1Col = (state.selectedRodIndex == 0) ? COLOR_YELLOW : 
                     (state.rods[0].isOvertime ? COLOR_DANGER : COLOR_BORDER_SUBTLE);
    drawThickRoundRect(6, 30, 216, 56, 6, 2, b1Col);

    // Bot #2 Keret (Alsó) - Csak az aktív bot sárga, az inaktív finom szürkéskék keretű
    uint16_t b2Col = (state.selectedRodIndex == 1) ? COLOR_YELLOW : 
                     (state.rods[1].isOvertime ? COLOR_DANGER : COLOR_BORDER_SUBTLE);
    drawThickRoundRect(6, 88, 216, 56, 6, 2, b2Col);
  } else {
    uint16_t borderCol = state.isOvertime ? COLOR_DANGER : (state.isTimerRunning ? COLOR_SUCCESS : COLOR_ACCENT);
    drawThickRoundRect(6, 30, 216, 114, 8, 2, borderCol);
  }
}

void updateTimerDigitsOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  if (state.rodCount == 2) {
    // ---------------------------------------------------------------------
    // 2-Botos Mód: Bot #1 és Bot #2 Számlálók (Size 3)
    // ---------------------------------------------------------------------
    for (int r = 0; r < 2; r++) {
      const RodState& rod = state.rods[r];
      char timeStr[16];
      uint16_t timeColor = COLOR_WHITE;
      int yPos = (r == 0) ? 46 : 104;

      if (!rod.isTimerRunning) {
        uint32_t displaySec = (rod.elapsedSec == 0) ? rod.targetSeconds : 
                              ((rod.targetSeconds > rod.elapsedSec) ? (rod.targetSeconds - rod.elapsedSec) : 0);
        sprintf(timeStr, "%02d:%02d", (int)(displaySec / 60), (int)(displaySec % 60));
        timeColor = (r == state.selectedRodIndex) ? COLOR_ACCENT : COLOR_TEXT_MUTED;
      } else if (!rod.isOvertime) {
        uint32_t remainSec = (rod.targetSeconds > rod.elapsedSec) ? (rod.targetSeconds - rod.elapsedSec) : 0;
        sprintf(timeStr, "%02d:%02d", (int)(remainSec / 60), (int)(remainSec % 60));
        timeColor = (remainSec <= 15) ? COLOR_WARN : COLOR_SUCCESS;
      } else {
        uint32_t overSec = rod.elapsedSec - rod.targetSeconds;
        sprintf(timeStr, "+%02d:%02d", (int)(overSec / 60), (int)(overSec % 60));
        timeColor = COLOR_DANGER;
      }

      tft->setTextSize(3);
      tft->setTextColor(timeColor, COLOR_CARD_BG);
      tft->setCursor(70, yPos);
      tft->print(timeStr);
    }
  } else {
    // ---------------------------------------------------------------------
    // 1-Botos Mód: Nagy Hero Stopper (Size 5)
    // ---------------------------------------------------------------------
    char timeStr[16];
    uint16_t timeColor = COLOR_WHITE;
    int cursorX = 39;
    static bool wasOvertime = false;

    if (!state.isTimerRunning) {
      uint32_t displaySec = (state.elapsedSec == 0) ? state.targetSeconds : 
                            ((state.targetSeconds > state.elapsedSec) ? (state.targetSeconds - state.elapsedSec) : 0);
      sprintf(timeStr, "%02d:%02d", (int)(displaySec / 60), (int)(displaySec % 60));
      timeColor = COLOR_ACCENT;
      cursorX = 39;
    } else if (!state.isOvertime) {
      uint32_t remainSec = (state.targetSeconds > state.elapsedSec) ? (state.targetSeconds - state.elapsedSec) : 0;
      sprintf(timeStr, "%02d:%02d", (int)(remainSec / 60), (int)(remainSec % 60));
      timeColor = (remainSec <= 15) ? COLOR_WARN : COLOR_SUCCESS;
      cursorX = 39;
    } else {
      uint32_t overSec = state.elapsedSec - state.targetSeconds;
      sprintf(timeStr, "+%02d:%02d", (int)(overSec / 60), (int)(overSec % 60));
      timeColor = COLOR_DANGER;
      cursorX = 24;
    }

    if (wasOvertime != state.isOvertime) {
      wasOvertime = state.isOvertime;
      tft->fillRect(10, 50, 208, 48, COLOR_BG);
    }

    tft->setTextSize(5);
    tft->setTextColor(timeColor, COLOR_BG);
    tft->setCursor(cursorX, 54);
    tft->print(timeStr);
  }
}

void updateProgressBarOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  if (state.rodCount == 2) {
    // 2-Botos Mód: Mini 3px-es csíkok mindkét boton
    for (int r = 0; r < 2; r++) {
      const RodState& rod = state.rods[r];
      int barX = 14;
      int barY = (r == 0) ? 78 : 136;
      int barW = 200;
      int barH = 3;
      int fillWidth = 0;

      if (rod.targetSeconds > 0) {
        if (rod.isOvertime) {
          fillWidth = barW;
        } else if (rod.isTimerRunning) {
          fillWidth = (rod.elapsedSec * barW) / rod.targetSeconds;
          if (fillWidth > barW) fillWidth = barW;
        }
      }

      uint16_t barCol = rod.isOvertime ? COLOR_DANGER : 
                       (!rod.isTimerRunning ? COLOR_PANEL : 
                       ((rod.targetSeconds - rod.elapsedSec <= 15) ? COLOR_WARN : COLOR_SUCCESS));

      if (fillWidth <= 0) {
        tft->fillRect(barX, barY, barW, barH, COLOR_PANEL);
      } else if (fillWidth >= barW) {
        tft->fillRect(barX, barY, barW, barH, barCol);
      } else {
        tft->fillRect(barX, barY, fillWidth, barH, barCol);
        tft->fillRect(barX + fillWidth, barY, barW - fillWidth, barH, COLOR_PANEL);
      }
    }
  } else {
    // 1-Botos Mód: 6px-es kerekített progress bar
    int barX = 14;
    int barY = 122;
    int barW = 200;
    int barH = 6;
    int fillWidth = 0;

    if (state.targetSeconds > 0) {
      if (state.isOvertime) {
        fillWidth = barW;
      } else if (state.isTimerRunning) {
        fillWidth = (state.elapsedSec * barW) / state.targetSeconds;
        if (fillWidth > barW) fillWidth = barW;
      }
    }

    uint16_t barColor = state.isOvertime ? COLOR_DANGER : 
                       (!state.isTimerRunning ? COLOR_ACCENT : 
                       ((state.targetSeconds - state.elapsedSec <= 15) ? COLOR_WARN : COLOR_SUCCESS));

    if (fillWidth <= 0) {
      tft->fillRoundRect(barX, barY, barW, barH, 3, COLOR_PANEL);
    } else if (fillWidth >= barW) {
      tft->fillRoundRect(barX, barY, barW, barH, 3, barColor);
    } else {
      tft->fillRoundRect(barX, barY, fillWidth, barH, 3, barColor);
      if (fillWidth < barW) {
        tft->fillRect(barX + fillWidth, barY, barW - fillWidth, barH, COLOR_PANEL);
        tft->drawFastVLine(barX + barW - 1, barY + 1, barH - 2, COLOR_BORDER_SUBTLE);
      }
    }
  }
}

void updateFooterStatsOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  int cardX = 6;
  int cardY = 148;
  int cardW = 308;
  int cardH = 88;

  // Felső Kártya Törzse: Aktív Szák Tartalom
  uint8_t actKn = state.activeKeepnetIndex;
  float knWeight = (actKn == 0) ? state.keepnet1WeightKg : state.keepnet2WeightKg;
  uint16_t knFish = (actKn == 0) ? state.keepnet1Fish : state.keepnet2Fish;

  tft->fillRect(cardX + 42, cardY + 6, 260, 20, COLOR_CARD_BG);

  // Súly (Size 2)
  char wBuf[16];
  sprintf(wBuf, "%4.1f kg", knWeight);
  tft->setTextSize(2);
  tft->setTextColor(COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(cardX + 42, cardY + 7);
  tft->print(wBuf);

  // Darabszám (Size 2)
  char pcBuf[16];
  sprintf(pcBuf, "%2d db", knFish);
  tft->setTextSize(2);
  tft->setTextColor(COLOR_WARN, COLOR_CARD_BG);
  tft->setCursor(cardX + 152, cardY + 7);
  tft->print(pcBuf);

  // 20 kg-os Limit Kapacitássáv (4px magas)
  int barX = cardX + 10;
  int barY = cardY + 28;
  int barW = 288;
  int barH = 4;
  int fillW = (int)((knWeight / 20.0f) * barW);
  if (fillW > barW) fillW = barW;
  if (fillW < 0) fillW = 0;

  uint16_t barCol = (knWeight >= 20.0f) ? COLOR_DANGER : ((knWeight >= 15.0f) ? COLOR_WARN : COLOR_SUCCESS);
  if (fillW > 0) {
    tft->fillRect(barX, barY, fillW, barH, barCol);
  }
  if (fillW < barW) {
    tft->fillRect(barX + fillW, barY, barW - fillW, barH, COLOR_PANEL);
  }

  // Alsó Rész: Összesített Verseny / Horgászat Statisztika
  tft->fillRect(cardX + 10, cardY + 48, 288, 34, COLOR_PANEL);

  // Bal oldal: ÖSSZ FOGÁS
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_PANEL);
  tft->setCursor(cardX + 18, cardY + 52);
  tft->print("OSSZ FOGAS");

  char totalPcBuf[16];
  sprintf(totalPcBuf, "%d db", state.fishCount);
  tft->setTextSize(2);
  tft->setTextColor(COLOR_YELLOW, COLOR_PANEL);
  tft->setCursor(cardX + 18, cardY + 64);
  tft->print(totalPcBuf);

  // Jobb oldal: ÖSSZ SÚLY
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_PANEL);
  tft->setCursor(cardX + 180, cardY + 52);
  tft->print("OSSZ SULY");

  char totalWBuf[16];
  sprintf(totalWBuf, "%.1f kg", state.totalWeightKg);
  tft->setTextSize(2);
  tft->setTextColor(COLOR_SUCCESS, COLOR_PANEL);
  tft->setCursor(cardX + 180, cardY + 64);
  tft->print(totalWBuf);
}

void updateSessionWidgetOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  uint32_t sessionSec = (state.isSessionActive && state.sessionStartMs > 0) ? 
                        ((millis() - state.sessionStartMs) / 1000) : 0;
  char sessBuf[16];
  sprintf(sessBuf, "%02d:%02d:%02d", (int)(sessionSec / 3600), (int)((sessionSec % 3600) / 60), (int)(sessionSec % 60));

  tft->fillRect(230, 96, 80, 16, COLOR_CARD_BG);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(234, 100);
  tft->print(sessBuf);
}

void updateRightWidgetsOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  int colX = 226;
  int colW = 88;

  // 1. TÁVOLSÁG KÁRTYA (Y: 30..72)
  tft->fillRoundRect(colX, 30, colW, 42, 6, COLOR_CARD_BG);
  tft->drawRoundRect(colX, 30, colW, 42, 6, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(colX + 8, 36);
  if (state.rodCount == 2) {
    tft->printf("TAV (B#%d)", state.selectedRodIndex + 1);
  } else {
    tft->print("TAVOLSAG");
  }

  uint16_t distM = (state.rodCount == 2) ? state.rods[state.selectedRodIndex].currentDistanceM : state.targetDistanceM;
  char distBuf[16];
  sprintf(distBuf, "%d m", distM);
  tft->setTextSize(2);
  tft->setTextColor(COLOR_YELLOW, COLOR_CARD_BG);
  tft->setCursor(colX + 8, 48);
  tft->print(distBuf);

  // 2. HORGÁSZIDŐ KÁRTYA (Y: 76..118)
  tft->fillRoundRect(colX, 76, colW, 42, 6, COLOR_CARD_BG);
  tft->drawRoundRect(colX, 76, colW, 42, 6, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(colX + 8, 82);
  tft->print("HORGASZIDO");
  updateSessionWidgetOnly(state);

  // 3. DOBÁSOK / TEMP KÁRTYA (Y: 122..144)
  tft->fillRoundRect(colX, 122, colW, 22, 6, COLOR_CARD_BG);
  tft->drawRoundRect(colX, 122, colW, 22, 6, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(colX + 8, 128);
  uint32_t totalCasts = state.rods[0].castCount + state.rods[1].castCount;
  tft->printf("DOBAS: #%lu", (unsigned long)(state.rodCount == 2 ? totalCasts : state.castCount));
}

void drawDashboardScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);

  // 1. Fejléc
  updateHeaderOnly(state);

  // 2. Hero Stopper Kártya (1-botos vagy 2-botos osztott nézet)
  if (state.rodCount == 2) {
    // Bot #1 Kártya (Felső)
    tft->fillRoundRect(6, 30, 216, 56, 6, COLOR_CARD_BG);
    tft->setTextSize(1);
    tft->setTextColor(COLOR_WHITE, COLOR_CARD_BG);
    tft->setCursor(12, 34);
    tft->printf("[BOT #1: %02d:%02d]", (int)(state.rods[0].targetSeconds / 60), (int)(state.rods[0].targetSeconds % 60));

    // Státusz jelző
    tft->setCursor(170, 34);
    if (state.rods[0].isOvertime) {
      tft->setTextColor(COLOR_DANGER, COLOR_CARD_BG);
      tft->print("TULID!");
    } else if (state.rods[0].isTimerRunning) {
      tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
      tft->print("FUT ●");
    } else {
      tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
      tft->print("ALL ○");
    }

    // Bot #2 Kártya (Alsó)
    tft->fillRoundRect(6, 88, 216, 56, 6, COLOR_CARD_BG);
    tft->setTextSize(1);
    tft->setTextColor(COLOR_WHITE, COLOR_CARD_BG);
    tft->setCursor(12, 92);
    tft->printf("[BOT #2: %02d:%02d]", (int)(state.rods[1].targetSeconds / 60), (int)(state.rods[1].targetSeconds % 60));

    // Státusz jelző
    tft->setCursor(170, 92);
    if (state.rods[1].isOvertime) {
      tft->setTextColor(COLOR_DANGER, COLOR_CARD_BG);
      tft->print("TULID!");
    } else if (state.rods[1].isTimerRunning) {
      tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
      tft->print("FUT ●");
    } else {
      tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
      tft->print("ALL ○");
    }

    updateHeroCardBorderOnly(state);
    updateTimerDigitsOnly(state);
    updateProgressBarOnly(state);
  } else {
    // 1-Botos Hero Stopper
    tft->fillRoundRect(6, 30, 216, 114, 8, COLOR_CARD_BG);
    updateHeroCardBorderOnly(state);
    updateTimerDigitsOnly(state);
    updateProgressBarOnly(state);
  }

  // 3. Jobb oldali Információs Widgetek
  updateRightWidgetsOnly(state);

  // 4. Alsó Kártya: Száktartalom & Összesített Statisztika
  int cardX = 6;
  int cardY = 148;
  int cardW = 308;
  int cardH = 88;

  tft->fillRoundRect(cardX, cardY, cardW, cardH, 6, COLOR_CARD_BG);
  tft->drawRoundRect(cardX, cardY, cardW, cardH, 6, COLOR_BORDER_SUBTLE);

  // Szák Badge (#1 vagy #2)
  uint8_t actKn = state.activeKeepnetIndex;
  tft->fillRoundRect(cardX + 8, cardY + 8, 28, 16, 4, COLOR_PANEL);
  tft->drawRoundRect(cardX + 8, cardY + 8, 28, 16, 4, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_WHITE, COLOR_PANEL);
  tft->setCursor(cardX + 14, cardY + 12);
  tft->printf("#%d", actKn + 1);

  updateFooterStatsOnly(state);
}

void updateRotaryFineTuneFeedback(const AppState& state) {
  updateHeaderOnly(state);
  updateHeroCardBorderOnly(state);
  updateTimerDigitsOnly(state);
  updateProgressBarOnly(state);
}
