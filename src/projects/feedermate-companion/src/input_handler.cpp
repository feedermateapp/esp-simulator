#include "input_handler.h"
#include "ble_manager.h"

// Rotary Enkóder Változók
static volatile int rotaryDelta = 0;

// Full Gray-Code State Machine for EC11 Rotary Encoder
static const int8_t ROTARY_STEPS[] = {
  0, -1,  1,  0,
  1,  0,  0, -1,
 -1,  0,  0,  1,
  0,  1, -1,  0
};

static volatile uint8_t rotaryLastState = 0;
static volatile int8_t rotaryPulseCount = 0;

void IRAM_ATTR isrRotary() {
  uint8_t current = (digitalRead(PIN_ROTARY_CLK) << 1) | digitalRead(PIN_ROTARY_DT);
  rotaryLastState = ((rotaryLastState << 2) | current) & 0x0F;
  int8_t step = ROTARY_STEPS[rotaryLastState];
  if (step != 0) {
    rotaryPulseCount += step;
    // Stabil reteszállás (detent): CLK=1 és DT=1 (current == 0x03)
    if (current == 0x03) {
      if (rotaryPulseCount >= 2) {
        rotaryDelta += 1;
      } else if (rotaryPulseCount <= -2) {
        rotaryDelta -= 1;
      }
      rotaryPulseCount = 0;
    }
  }
}

void initInputHandler() {
  pinMode(PIN_ROTARY_CLK, INPUT_PULLUP);
  pinMode(PIN_ROTARY_DT, INPUT_PULLUP);
  pinMode(PIN_ROTARY_SW, INPUT_PULLUP);
  pinMode(PIN_CAST_BTN, INPUT_PULLUP);
  pinMode(PIN_CAST2_BTN, INPUT_PULLUP);
  pinMode(PIN_MENU_BTN, INPUT_PULLUP);

  rotaryLastState = (digitalRead(PIN_ROTARY_CLK) << 1) | digitalRead(PIN_ROTARY_DT);

  attachInterrupt(digitalPinToInterrupt(PIN_ROTARY_CLK), isrRotary, CHANGE);
  attachInterrupt(digitalPinToInterrupt(PIN_ROTARY_DT), isrRotary, CHANGE);
}

// -------------------------------------------------------------------------
// Dobás Indítása Adott Boton (1 vagy 2 Botos Mód)
// -------------------------------------------------------------------------
static void triggerRodCast(AppState& appState, int rodIndex) {
  uint32_t currentMs = millis();

  // Ha még nem indult el a session, az első dobás automatikusan elindítja a session órát
  if (!appState.isSessionActive) {
    appState.isSessionActive = true;
    appState.sessionStartMs = currentMs;
    Serial.println("🎣 [SESSION AUTO-START] Horgaszat automatikusan elindult az elso dobassal!");
  }

  if (rodIndex < 0) rodIndex = 0;
  if (rodIndex > 1) rodIndex = 1;

  appState.selectedRodIndex = rodIndex;
  RodState& rod = appState.rods[rodIndex];

  // A legutoljára beállított célidővel indul!
  int presetCount = getPresetCount();
  if (rod.activePresetIndex == presetCount - 1) {
    rod.targetSeconds = (rod.customTempSeconds > 0) ? rod.customTempSeconds : 180;
  } else {
    rod.targetSeconds = getPreset(rod.activePresetIndex).targetSeconds;
  }

  rod.castCount++;
  rod.elapsedSec = 0;
  rod.timerStartMs = currentMs;
  rod.isTimerRunning = true;
  rod.isOvertime = false;

  // Kompatibilitási mezők szinkronizálása
  appState.activePresetIndex = rod.activePresetIndex;
  appState.targetSeconds = rod.targetSeconds;
  appState.customTempSeconds = rod.customTempSeconds;
  appState.castCount = rod.castCount;
  appState.elapsedSec = 0;
  appState.timerStartMs = currentMs;
  appState.isTimerRunning = true;
  appState.isOvertime = false;

  Serial.printf("▶️ [DOBAS BOT #%d - #%lu] Visszaszamlalo elinditva (%s - %lu mp, %u m)!\n", 
                rodIndex + 1, (unsigned long)rod.castCount, getPreset(rod.activePresetIndex).name, 
                (unsigned long)rod.targetSeconds, rod.currentDistanceM);

  drawDashboardScreen(appState);

  // BLE esemény küldése a mobilnak (NUS JSON + binary)
  sendBleHardwareEvent(EVENT_CAST_STARTED);
}

void processInputs(AppState& appState) {
  uint32_t currentMs = millis();

  // 1. DEDIKÁLT SÁRGA MENÜ GOMB (D26) – FŐMENÜ MEGNYITÁSA / VISSZATÉRÉS
  static int lastMenuBtnState = HIGH;
  static uint32_t lastMenuDebounceMs = 0;
  int currentMenuState = digitalRead(PIN_MENU_BTN);

  if (currentMenuState == LOW && lastMenuBtnState == HIGH && (currentMs - lastMenuDebounceMs > 200)) {
    lastMenuDebounceMs = currentMs;
    digitalWrite(PIN_ALERT_LED, HIGH);
    digitalWrite(PIN_ONBOARD_LED, HIGH);

    if (appState.currentScreen == SCREEN_DASHBOARD) {
      openMainMenu(appState);
      Serial.println("📑 [FOMENU D26] Fomenu megnyitva.");
    } else {
      returnToDashboard(appState);
      Serial.println("📊 [FOMENU D26] Visszateres a Fokepernyore.");
    }

    delay(30);
    digitalWrite(PIN_ALERT_LED, LOW);
    digitalWrite(PIN_ONBOARD_LED, LOW);
  }
  lastMenuBtnState = currentMenuState;

  // 2. 1. GOMB (D14 / KO / CAST) – Főképernyőn: AKTÍV BOT Dobás | Menüben: Visszalépés
  static int lastCastBtnState = HIGH;
  static uint32_t lastCastDebounceMs = 0;
  int currentCastState = digitalRead(PIN_CAST_BTN);
  if (currentCastState == LOW && lastCastBtnState == HIGH && (currentMs - lastCastDebounceMs > 250)) {
    lastCastDebounceMs = currentMs;
    if (appState.currentScreen == SCREEN_DASHBOARD) {
      triggerRodCast(appState, appState.selectedRodIndex); // Mindig az AKTÍV fókuszált botot indítja!
    } else {
      handleBackAction(appState);
      Serial.println("↩️ [KO GOMB] Visszalepes az elozo szintre.");
    }
  }
  lastCastBtnState = currentCastState;

  // 3. 3. GOMB (D33 / BOT VÁLTÓ) – Főképernyőn: AKTÍV BOT VÁLTÁSA (2 botos módban) | Menüben: Visszalépés
  static int lastCast2BtnState = HIGH;
  static uint32_t lastCast2DebounceMs = 0;
  int currentCast2State = digitalRead(PIN_CAST2_BTN);
  if (currentCast2State == LOW && lastCast2BtnState == HIGH && (currentMs - lastCast2DebounceMs > 200)) {
    lastCast2DebounceMs = currentMs;
    Serial.println("🔘 [GOMB D33] Botvalto gomb megnyomva!");
    digitalWrite(PIN_ALERT_LED, HIGH);
    digitalWrite(PIN_ONBOARD_LED, HIGH);

    if (appState.currentScreen == SCREEN_DASHBOARD) {
      if (appState.rodCount == 2) {
        // FÓKUSZVÁLTÁS Bot 1 <-> Bot 2 között!
        appState.selectedRodIndex = 1 - appState.selectedRodIndex;
        RodState& rod = appState.rods[appState.selectedRodIndex];
        appState.activePresetIndex = rod.activePresetIndex;
        appState.targetSeconds = rod.targetSeconds;
        appState.isTimerRunning = rod.isTimerRunning;
        appState.isOvertime = rod.isOvertime;
        appState.elapsedSec = rod.elapsedSec;
        appState.castCount = rod.castCount;

        updateHeroCardBorderOnly(appState);
        updateTimerDigitsOnly(appState);
        updateRightWidgetsOnly(appState);
        updateHeaderOnly(appState);
        Serial.printf("🎯 [BOT VALTAS D33] Aktiv bot valtva: Bot #%d\n", appState.selectedRodIndex + 1);
      } else {
        Serial.println("ℹ️ [D33] 1-Botos horgaszat fut, nincs botvaltas.");
      }
    } else if (appState.currentScreen == SCREEN_PRESET_MENU) {
      // PRESET MENÜBEN: D33 FÜLVÁLTÁS (IDŐ <-> TÁVOLSÁG)!
      appState.presetTab = 1 - appState.presetTab;
      drawPresetMenuScreen(appState);
      Serial.printf("📑 [D33 FULVALTAS] Aktiv ful: %s\n", appState.presetTab == 0 ? "IDO RITMUS" : "TAVOLSAG");
    } else {
      handleBackAction(appState);
      Serial.println("↩️ [D33 GOMB] Visszalepes az elozo szintre.");
    }

    delay(20);
    digitalWrite(PIN_ALERT_LED, LOW);
    digitalWrite(PIN_ONBOARD_LED, LOW);
  }
  lastCast2BtnState = currentCast2State;

  // 4. ROTARY SW GOMB (D22) – Rövid: Preset Menü az AKTÍV bothoz | Hosszú: Reset az AKTÍV botra
  static int lastSwState = HIGH;
  static uint32_t swPressStartMs = 0;
  static bool swLongPressFired = false;
  int currentSwState = digitalRead(PIN_ROTARY_SW);

  if (currentSwState == LOW && lastSwState == HIGH) {
    swPressStartMs = currentMs;
    swLongPressFired = false;
  } else if (currentSwState == LOW && lastSwState == LOW) {
    // Hosszú nyomás (> 600 ms) a Főképernyőn: Stopper Megállítása & Visszaállítása
    if (!swLongPressFired && (currentMs - swPressStartMs >= 600)) {
      swLongPressFired = true;
      if (appState.currentScreen == SCREEN_DASHBOARD) {
        RodState& rod = appState.rods[appState.selectedRodIndex];
        rod.isTimerRunning = false;
        rod.isOvertime = false;
        rod.elapsedSec = 0;

        int presetCount = getPresetCount();
        if (rod.activePresetIndex == presetCount - 1) {
          rod.targetSeconds = (rod.customTempSeconds > 0) ? rod.customTempSeconds : 180;
        } else {
          rod.targetSeconds = getPreset(rod.activePresetIndex).targetSeconds;
        }

        appState.isTimerRunning = rod.isTimerRunning;
        appState.isOvertime = rod.isOvertime;
        appState.elapsedSec = rod.elapsedSec;
        appState.targetSeconds = rod.targetSeconds;

        Serial.printf("🔄 [RESET] Bot #%d stopper visszaallitva celidore.\n", appState.selectedRodIndex + 1);
        if (appState.rodCount == 2) {
          updateHeroCardBorderOnly(appState);
          updateTimerDigitsOnly(appState);
          updateProgressBarOnly(appState);
          updateHeaderOnly(appState);
          updateRightWidgetsOnly(appState);
        } else {
          drawDashboardScreen(appState);
        }

        // BLE esemény küldése a mobilnak (CAST_STOPPED)
        sendBleHardwareEvent(EVENT_CAST_STOPPED);
      }
    }
  } else if (currentSwState == HIGH && lastSwState == LOW) {
    // Rövid nyomás (40ms - 600ms)
    if (!swLongPressFired && (currentMs - swPressStartMs >= 40)) {
      if (appState.currentScreen == SCREEN_DASHBOARD) {
        // GYORS PRESET MENÜ MEGNYITÁSA AZ AKTÍV BOTHOZ (Idő és Távolság)
        appState.presetTab = 0;
        appState.selectedPresetIndex = appState.rods[appState.selectedRodIndex].activePresetIndex;
        appState.selectedDistancePresetIndex = 0;
        int dCount = getDistancePresetCount();
        for (int d = 0; d < dCount - 1; d++) {
          if (getDistancePreset(d).distanceM == appState.rods[appState.selectedRodIndex].currentDistanceM) {
            appState.selectedDistancePresetIndex = d;
            break;
          }
        }
        appState.currentScreen = SCREEN_PRESET_MENU;
        drawPresetMenuScreen(appState);
        Serial.printf("⏱️ [ROTARY SW] Taktikai Preset valaszto megnyitva (Bot #%d).\n", appState.selectedRodIndex + 1);
      } else {
        // Bármelyik Menüben vagy Al-képernyőn: KIVÁLASZTÁS / MENTÉS
        handleMenuSelect(appState);
      }
    }
  }
  lastSwState = currentSwState;

  // 5. ROTARY FORGATÁS KEZELÉSE
  if (rotaryDelta != 0) {
    int delta = rotaryDelta;
    rotaryDelta = 0;

    if (appState.currentScreen == SCREEN_DASHBOARD) {
      // Főképernyőn: A fókuszált bot presetjét pörgeti a következő dobáshoz!
      RodState& rod = appState.rods[appState.selectedRodIndex];
      int presetCount = getPresetCount();
      int prevPreset = rod.activePresetIndex;
      rod.activePresetIndex = (rod.activePresetIndex + delta) % presetCount;
      if (rod.activePresetIndex < 0) {
        rod.activePresetIndex += presetCount;
      }

      if (rod.activePresetIndex != prevPreset) {
        if (!rod.isTimerRunning) {
          if (rod.activePresetIndex == presetCount - 1) {
            rod.targetSeconds = (rod.customTempSeconds > 0) ? rod.customTempSeconds : 180;
          } else {
            rod.targetSeconds = getPreset(rod.activePresetIndex).targetSeconds;
          }
          rod.elapsedSec = 0;
          appState.targetSeconds = rod.targetSeconds;
          appState.activePresetIndex = rod.activePresetIndex;

          if (appState.rodCount == 2) {
            updateHeroCardBorderOnly(appState);
            updateTimerDigitsOnly(appState);
            updateProgressBarOnly(appState);
            updateHeaderOnly(appState);
            updateRightWidgetsOnly(appState);
          } else {
            updateHeroCardBorderOnly(appState);
            updateTimerDigitsOnly(appState);
            updateProgressBarOnly(appState);
            updateHeaderOnly(appState);
          }
        } else {
          // Ha FUT: csak a fejlécet frissítjük a következő dobáshoz
          appState.activePresetIndex = rod.activePresetIndex;
          updateHeaderOnly(appState);
        }

        Serial.printf("⏱️ [BOT #%d PRESET] Kivalasztott profil: %s (%lu mp)\n", 
                      appState.selectedRodIndex + 1, getPreset(rod.activePresetIndex).name, (unsigned long)rod.targetSeconds);
      }
    } else {
      handleMenuRotary(delta, appState);
    }
  }
}
