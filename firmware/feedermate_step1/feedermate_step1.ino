// =========================================================================
// FeederMate Smart Companion – Főprogram v2.0-PRO (Moduláris Architektúra)
// Célhardver: ESP32-S + ST7789 320x240 Kijelző + Integrált Rotary + 2 Gomb
// =========================================================================

#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>

#include "config.h"
#include "state_types.h"
#include "data_models.h"
#include "display_driver.h"
#include "input_handler.h"
#include "menu_system.h"
#include "ble_manager.h"

// Hardveres ST7789 SPI csatoló
Adafruit_ST7789 tft = Adafruit_ST7789(&SPI, PIN_TFT_CS, PIN_TFT_DC, PIN_TFT_RST);

// Globális Rendszerállapot
AppState appState = {
  SCREEN_DASHBOARD, // currentScreen
  0,                // selectedMainMenuIndex
  1,                // rodCount (1 vagy 2 botos)
  0,                // selectedRodIndex (0 = Bot #1, 1 = Bot #2)
  {
    { 0, 120, 120, 0, 0, 0, false, false, 65 }, // rods[0] (Bot #1: 2p, 65m)
    { 1, 300, 300, 0, 0, 0, false, false, 45 }  // rods[1] (Bot #2: 5p, 45m)
  },
  0,                // selectedPresetIndex
  0,                // activePresetIndex (2 Perc: 02:00)
  120,              // targetSeconds (120 mp = 2 perc)
  120,              // customTempSeconds
  false,            // isTimerRunning
  false,            // isOvertime
  0,                // timerStartMs
  0,                // elapsedSec
  0,                // castCount
  0,                // catchSpeciesIndex (Ponty)
  2.0f,             // catchTempWeightKg
  0,                // selectedCatchStep
  0,                // fishCount
  0.0f,             // totalWeightKg
  0,                // keepnet1Fish
  0.0f,             // keepnet1WeightKg
  0,                // keepnet2Fish
  0.0f,             // keepnet2WeightKg
  0,                // activeKeepnetIndex (Szák #1)
  65,               // targetDistanceM (Klipszelt táv: 65 m)
  65,               // tempDistanceM
  false,            // isSessionActive (Nem indult még el a hivatalos session)
  0,                // sessionStartMs
  0,                // fastestCatchSec
  0,                // selectedSettingIndex
  4,                // brightnessLevel (80%)
  true,             // isCountdownMode
  true,             // buzzerEnabled
  true,             // ledAlertEnabled
  0,                // languageIndex (HU)
  28800,            // rtcBaseEpochSec (Alapértelmezett: 08:00:00)
  0,                // rtcBootMs
  false,            // isBleConnected
  0,                // selectedBleTestAction
  8,                // tempClockHour (08)
  0,                // tempClockMinute (00)
  0,                // clockSettingStep (0 = Hour)
  0,                // sessionSetupField
  1,                // sessionSetupRodCount
  0,                // sessionSetupPreset1 (2 Perc)
  1,                // sessionSetupPreset2 (5 Perc)
  65,               // sessionSetupDistanceM (65 m)
  0,                // presetTab (0 = IDŐ RITMUS, 1 = TÁVOLSÁG)
  0                 // selectedDistancePresetIndex (25 m)
};

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n\n==========================================");
  Serial.println("  FeederMate Companion: Pro v2.0 Modular  ");
  Serial.println("  ST7789 + Rotary EC11 + 2 Physical Btns  ");
  Serial.println("==========================================");

  // Állapotjelző LED-ek (D13 külső, D2 belső kék LED)
  pinMode(PIN_ALERT_LED, OUTPUT);
  pinMode(PIN_ONBOARD_LED, OUTPUT);
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_ALERT_LED, HIGH);
    digitalWrite(PIN_ONBOARD_LED, HIGH);
    delay(80);
    digitalWrite(PIN_ALERT_LED, LOW);
    digitalWrite(PIN_ONBOARD_LED, LOW);
    delay(80);
  }

  // Bemenetkezelő inicializálása (Rotary + Gombok)
  initInputHandler();

  // Kijelző vezérlő lábak és hardveres Reset
  pinMode(PIN_TFT_CS, OUTPUT);
  digitalWrite(PIN_TFT_CS, HIGH);
  pinMode(PIN_TFT_DC, OUTPUT);
  pinMode(PIN_TFT_RST, OUTPUT);

  digitalWrite(PIN_TFT_RST, HIGH);
  delay(50);
  digitalWrite(PIN_TFT_RST, LOW);
  delay(50);
  digitalWrite(PIN_TFT_RST, HIGH);
  delay(150);

  // SPI Hardver busz inicializálása
  SPI.begin(PIN_TFT_SCLK, -1, PIN_TFT_MOSI, PIN_TFT_CS);

  // ST7789 Kijelző inicializálása
  tft.init(240, 320);
  tft.setSPISpeed(27000000);
  tft.setRotation(3);
  tft.invertDisplay(false);
  tft.setTextWrap(false);

  // Menümotor inicializálása
  initMenuSystem(&tft);
  drawScreen(appState);

  // BLE GATT Szerver inicializálása
  initBleManager(appState);

  Serial.println("[OK] Modularis rendszer sikeresen elindult!");
}

void loop() {
  uint32_t currentMs = millis();

  // 1. Gombok és Rotary események feldolgozása
  processInputs(appState);

  // 2. Dobás Stopper Számláló és Riasztás Motor
  bool anyOvertime = false;
  for (int r = 0; r < appState.rodCount; r++) {
    if (appState.rods[r].isTimerRunning) {
      uint32_t calcSec = (currentMs - appState.rods[r].timerStartMs) / 1000;
      if (calcSec != appState.rods[r].elapsedSec) {
        appState.rods[r].elapsedSec = calcSec;
        bool prevOvertime = appState.rods[r].isOvertime;
        appState.rods[r].isOvertime = (appState.rods[r].elapsedSec >= appState.rods[r].targetSeconds);

        if (!prevOvertime && appState.rods[r].isOvertime) {
          Serial.printf("🚨 [TULIDO] Letelt a celido a Bot #%d-on!\n", r + 1);
          if (appState.currentScreen == SCREEN_DASHBOARD) {
            updateHeaderOnly(appState);
            updateHeroCardBorderOnly(appState);
          }
        }

        if (appState.currentScreen == SCREEN_DASHBOARD) {
          updateTimerDigitsOnly(appState);
          updateProgressBarOnly(appState);
        }
      }
      if (appState.rods[r].isOvertime) {
        anyOvertime = true;
      }
    }
  }

  // Kompatibilitási mezők szinkronban tartása
  appState.isTimerRunning = appState.rods[appState.selectedRodIndex].isTimerRunning;
  appState.isOvertime = appState.rods[appState.selectedRodIndex].isOvertime;
  appState.elapsedSec = appState.rods[appState.selectedRodIndex].elapsedSec;
  appState.targetSeconds = appState.rods[appState.selectedRodIndex].targetSeconds;
  appState.castCount = appState.rods[appState.selectedRodIndex].castCount;

  // Túlidő riasztó LED villogás (ha bármelyik aktív bot túlidős)
  if (anyOvertime && appState.ledAlertEnabled) {
    digitalWrite(PIN_ALERT_LED, ((currentMs / 500) % 2 == 0) ? HIGH : LOW);
  } else {
    digitalWrite(PIN_ALERT_LED, LOW);
  }

  // 3. Session Óra Másodpercenkénti Frissítése a Főképernyőn (akkor is, ha a dobás stopper épp áll!)
  static uint32_t lastSessionSec = 999999;
  if (appState.isSessionActive && appState.sessionStartMs > 0) {
    uint32_t currSessionSec = (currentMs - appState.sessionStartMs) / 1000;
    if (currSessionSec != lastSessionSec) {
      lastSessionSec = currSessionSec;
      if (appState.currentScreen == SCREEN_DASHBOARD) {
        updateSessionWidgetOnly(appState);
      }
    }
  }

  // 4. Fejléc Pontos Idő Frissítése Percenként
  static uint32_t lastHeaderMin = 999999;
  uint32_t currMin = (currentMs / 60000);
  if (currMin != lastHeaderMin) {
    lastHeaderMin = currMin;
    if (appState.currentScreen == SCREEN_DASHBOARD) {
      updateHeaderOnly(appState);
    }
  }

  // 5. BLE Telemetria Értesítések Küldése (5 másodpercenként)
  static uint32_t lastBleTelemetryMs = 0;
  if (currentMs - lastBleTelemetryMs >= 5000) {
    lastBleTelemetryMs = currentMs;
    updateBleTelemetry(appState);
  }
}


