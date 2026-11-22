#include "screen_ble_debug.h"
#include "ble_manager.h"

// 5 Teszt Művelet (NUS JSON Stream)
static const char* BLE_TEST_ACTIONS[] = {
  "1. PING {\"type\":\"PING\"}",
  "2. DOBAS {\"type\":\"CAST_STARTED\"}",
  "3. STOP {\"type\":\"CAST_STOPPED\"}",
  "4. FOGAS {\"type\":\"CATCH_ADDED\"}",
  "5. ALLAPOT {\"type\":\"HEARTBEAT\"}"
};
static const int BLE_TEST_ACTION_COUNT = 5;

void updateBleDebugSelectorOnly(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  int sel = state.selectedBleTestAction;
  if (sel < 0) sel = 0;
  if (sel >= BLE_TEST_ACTION_COUNT) sel = BLE_TEST_ACTION_COUNT - 1;

  // Választómező területének törlése és újrarajzolása
  tft->fillRect(10, 112, 300, 30, COLOR_PANEL);
  tft->fillRoundRect(12, 113, 296, 28, 6, COLOR_SELECTED_BG);
  tft->drawRoundRect(12, 113, 296, 28, 6, COLOR_YELLOW);

  tft->setTextSize(1);
  tft->setTextColor(COLOR_YELLOW, COLOR_SELECTED_BG);
  tft->setCursor(20, 123);
  tft->print("<");

  tft->setTextColor(COLOR_WHITE, COLOR_SELECTED_BG);
  tft->setCursor(42, 123);
  tft->print(BLE_TEST_ACTIONS[sel]);

  tft->setTextColor(COLOR_YELLOW, COLOR_SELECTED_BG);
  tft->setCursor(295, 123);
  tft->print(">");
}

void updateBleDebugLiveFeed(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  // 1. Állapot Kártya Frissítése
  tft->fillRect(12, 44, 296, 38, COLOR_CARD_BG);
  
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 46);
  tft->print("Kliens: ");
  if (state.isBleConnected) {
    tft->setTextColor(COLOR_SUCCESS, COLOR_CARD_BG);
    tft->print("CSATLAKOZVA (Online)");
  } else {
    tft->setTextColor(COLOR_WARN, COLOR_CARD_BG);
    tft->print("HIRDETES (Varakozas...)");
  }

  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_CARD_BG);
  tft->setCursor(14, 62);
  tft->printf("TX Csomag: %lu db  |  RX Csomag: %lu db", 
             (unsigned long)getBleTxPacketCount(), (unsigned long)getBleRxPacketCount());

  // 2. Fejléc Pill Badge Frissítése
  tft->fillRoundRect(206, 4, 108, 18, 9, state.isBleConnected ? COLOR_SUCCESS : COLOR_PANEL);
  tft->drawRoundRect(206, 4, 108, 18, 9, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(state.isBleConnected ? COLOR_BG : COLOR_YELLOW, state.isBleConnected ? COLOR_SUCCESS : COLOR_PANEL);
  tft->setCursor(214, 9);
  tft->print(state.isBleConnected ? "CSATLAKOZVA" : "HIRDET (ADV)");

  // 3. Eseménynapló Box Frissítése
  tft->fillRect(10, 166, 300, 42, 0x0000);
  int count = getBleLogCount();
  int startY = 168;

  if (count == 0) {
    tft->setTextSize(1);
    tft->setTextColor(COLOR_TEXT_MUTED, 0x0000);
    tft->setCursor(16, startY + 12);
    tft->print("Nincs meg rogzitett BLE aktivitas...");
  } else {
    for (int i = 0; i < count && i < 3; i++) {
      const char* logLine = getBleLog(i);
      if (!logLine) continue;

      tft->setTextSize(1);
      if (strncmp(logLine, "[RX]", 4) == 0) {
        tft->setTextColor(COLOR_SUCCESS, 0x0000);
      } else if (strncmp(logLine, "[TX]", 4) == 0) {
        tft->setTextColor(COLOR_ACCENT, 0x0000);
      } else if (strncmp(logLine, "[STATUS]", 8) == 0) {
        tft->setTextColor(COLOR_YELLOW, 0x0000);
      } else {
        tft->setTextColor(COLOR_WHITE, 0x0000);
      }

      tft->setCursor(14, startY + (i * 13));
      tft->print(logLine);
    }
  }
}

void drawBleDebugScreen(const AppState& state) {
  Adafruit_ST7789* tft = getTft();
  if (!tft) return;

  tft->fillScreen(COLOR_BG);

  // 1. Fejléc
  tft->fillRect(0, 0, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 26, 320, COLOR_ACCENT);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_ACCENT, COLOR_HEADER_BG);
  tft->setCursor(10, 9);
  tft->print("BLUETOOTH DEBUG & TEST");

  // 2. GATT Státusz Kártya
  tft->fillRoundRect(6, 30, 308, 56, 6, COLOR_CARD_BG);
  tft->drawRoundRect(6, 30, 308, 56, 6, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_WHITE, COLOR_CARD_BG);
  tft->setCursor(14, 34);
  tft->print("Eszkoz: FeederMate-ESP32  | GATT: AKTIV");

  // 3. Teszt Akció Választó Kártya
  tft->fillRoundRect(6, 90, 308, 56, 6, COLOR_PANEL);
  tft->drawRoundRect(6, 90, 308, 56, 6, COLOR_ACCENT);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_YELLOW, COLOR_PANEL);
  tft->setCursor(14, 96);
  tft->print("TESZT ESEMENY KULDESE MOBILNAK:");
  updateBleDebugSelectorOnly(state);

  // 4. Eseménynapló Box
  tft->fillRoundRect(6, 150, 308, 60, 6, 0x0000);
  tft->drawRoundRect(6, 150, 308, 60, 6, 0x2965);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, 0x0000);
  tft->setCursor(12, 154);
  tft->print("ELO GATT ESEMENYNAPLO (STREAM):");

  updateBleDebugLiveFeed(state);

  // 5. Alsó Segédsáv
  tft->fillRect(0, 214, 320, 26, COLOR_HEADER_BG);
  tft->drawFastHLine(0, 214, 320, COLOR_BORDER_SUBTLE);
  tft->setTextSize(1);
  tft->setTextColor(COLOR_TEXT_MUTED, COLOR_HEADER_BG);
  tft->setCursor(14, 222);
  tft->print("[ROTARY]: Valaszt | [SW]: Teszt kuldes | [KO]: Vissza");
}

void handleBleDebugRotary(int delta, AppState& state) {
  state.selectedBleTestAction += delta;
  if (state.selectedBleTestAction < 0) {
    state.selectedBleTestAction = BLE_TEST_ACTION_COUNT - 1;
  }
  if (state.selectedBleTestAction >= BLE_TEST_ACTION_COUNT) {
    state.selectedBleTestAction = 0;
  }
  updateBleDebugSelectorOnly(state);
}

bool handleBleDebugSelect(AppState& state) {
  // Kiválasztott teszt akció végrehajtása
  triggerBleTestAction(state.selectedBleTestAction, state);
  updateBleDebugLiveFeed(state);
  return true;
}
