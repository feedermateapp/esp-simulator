#include "ble_manager.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include "screen_dashboard.h"
#include "screen_ble_debug.h"
#include "data_models.h"

// =========================================================================
// FeederMate Smart Companion – BLE GATT Kezelő Modul Implementáció
// (Nordic UART Service + Custom GATT + Realtime JSON Stream)
// =========================================================================

static AppState* globalState = nullptr;
static BLEServer* pServer = nullptr;

// Nordic UART Service (NUS) Karakterisztikák
static BLECharacteristic* pCharNusRx = nullptr;
static BLECharacteristic* pCharNusTx = nullptr;

// Custom Karakterisztikák
static BLECharacteristic* pCharLiveTimer = nullptr;
static BLECharacteristic* pCharLiveKeepnet = nullptr;
static BLECharacteristic* pCharHwEvents = nullptr;
static BLECharacteristic* pCharMobileCmds = nullptr;
static BLECharacteristic* pCharTimeSync = nullptr;

static bool isConnected = false;

// Debug Statisztika & Élő Eseménynapló
#define MAX_BLE_LOGS 5
static char bleLogs[MAX_BLE_LOGS][36];
static int bleLogCount = 0;
static uint32_t bleTxPacketCount = 0;
static uint32_t bleRxPacketCount = 0;

void addBleDebugLog(const char* logMsg) {
  if (!logMsg) return;
  if (bleLogCount < MAX_BLE_LOGS) {
    strncpy(bleLogs[bleLogCount], logMsg, sizeof(bleLogs[0]) - 1);
    bleLogs[bleLogCount][sizeof(bleLogs[0]) - 1] = '\0';
    bleLogCount++;
  } else {
    for (int i = 0; i < MAX_BLE_LOGS - 1; i++) {
      strcpy(bleLogs[i], bleLogs[i + 1]);
    }
    strncpy(bleLogs[MAX_BLE_LOGS - 1], logMsg, sizeof(bleLogs[0]) - 1);
    bleLogs[MAX_BLE_LOGS - 1][sizeof(bleLogs[0]) - 1] = '\0';
  }
  if (globalState && globalState->currentScreen == SCREEN_BLE_DEBUG) {
    updateBleDebugLiveFeed(*globalState);
  }
}

int getBleLogCount() {
  return bleLogCount;
}

const char* getBleLog(int index) {
  if (index < 0 || index >= bleLogCount) return nullptr;
  return bleLogs[index];
}

uint32_t getBleTxPacketCount() {
  return bleTxPacketCount;
}

uint32_t getBleRxPacketCount() {
  return bleRxPacketCount;
}

// -------------------------------------------------------------------------
// JSON Sor Küldése Mobil felé (NUS TX Notify)
// -------------------------------------------------------------------------
void sendBleJson(const char* jsonStr) {
  if (!jsonStr) return;
  
  char buffer[384];
  size_t len = strlen(jsonStr);
  if (len > sizeof(buffer) - 2) len = sizeof(buffer) - 2;
  memcpy(buffer, jsonStr, len);
  if (buffer[len - 1] != '\n') {
    buffer[len++] = '\n';
  }
  buffer[len] = '\0';

  if (isConnected && pCharNusTx) {
    pCharNusTx->setValue((uint8_t*)buffer, len);
    pCharNusTx->notify();
    bleTxPacketCount++;
  }

  // Debug log (első 30 karakter)
  char logSnippet[36];
  snprintf(logSnippet, sizeof(logSnippet), "[TX] %s", jsonStr);
  // Újsor törlése a log szövegéből
  for (int i = 0; i < 35 && logSnippet[i] != '\0'; i++) {
    if (logSnippet[i] == '\n' || logSnippet[i] == '\r') {
      logSnippet[i] = '\0';
      break;
    }
  }
  addBleDebugLog(logSnippet);
}

// -------------------------------------------------------------------------
// Egyszerű JSON Mező Érték Kereső (Zero-dependency)
// -------------------------------------------------------------------------
static bool getJsonStringValue(const char* json, const char* key, char* outBuf, size_t maxLen) {
  char searchKey[48];
  snprintf(searchKey, sizeof(searchKey), "\"%s\"", key);
  const char* pos = strstr(json, searchKey);
  if (!pos) return false;
  pos += strlen(searchKey);
  while (*pos == ' ' || *pos == ':') pos++;
  if (*pos == '\"') {
    pos++;
    size_t i = 0;
    while (*pos && *pos != '\"' && i < maxLen - 1) {
      outBuf[i++] = *pos++;
    }
    outBuf[i] = '\0';
    return true;
  }
  return false;
}

static bool getJsonInt32Value(const char* json, const char* key, int32_t* outVal) {
  char searchKey[48];
  snprintf(searchKey, sizeof(searchKey), "\"%s\"", key);
  const char* pos = strstr(json, searchKey);
  if (!pos) return false;
  pos += strlen(searchKey);
  while (*pos == ' ' || *pos == ':') pos++;
  *outVal = atol(pos);
  return true;
}

static bool getJsonFloatValue(const char* json, const char* key, float* outVal) {
  char searchKey[48];
  snprintf(searchKey, sizeof(searchKey), "\"%s\"", key);
  const char* pos = strstr(json, searchKey);
  if (!pos) return false;
  pos += strlen(searchKey);
  while (*pos == ' ' || *pos == ':') pos++;
  *outVal = (float)atof(pos);
  return true;
}

// -------------------------------------------------------------------------
// Bejövő JSON Parancsok Feldolgozása (Mobile -> ESP32)
// -------------------------------------------------------------------------
static void processInboundJsonLine(const char* line) {
  if (!line || strlen(line) == 0 || !globalState) return;

  bleRxPacketCount++;

  char cmdStr[32] = {0};
  if (!getJsonStringValue(line, "cmd", cmdStr, sizeof(cmdStr))) {
    // Ha nincs "cmd", nézzük meg, hogy "type" van-e
    getJsonStringValue(line, "type", cmdStr, sizeof(cmdStr));
  }

  char logBuf[36];
  snprintf(logBuf, sizeof(logBuf), "[RX] %s", cmdStr[0] ? cmdStr : "JSON Adat");
  addBleDebugLog(logBuf);
  Serial.printf("📥 [BLE JSON RX] %s\n", line);

  // 1. SYNC_TIME Parancs
  if (strcasecmp(cmdStr, "SYNC_TIME") == 0) {
    int32_t epoch = 0;
    int32_t localEpoch = 0;
    int32_t tzOffset = 0;
    char timeStrBuf[16] = {0};

    if (getJsonStringValue(line, "time", timeStrBuf, sizeof(timeStrBuf))) {
      int h = 0, m = 0;
      if (sscanf(timeStrBuf, "%d:%d", &h, &m) == 2) {
        globalState->rtcBaseEpochSec = ((uint32_t)h * 3600) + ((uint32_t)m * 60);
        globalState->rtcBootMs = millis();
      }
    } else if (getJsonInt32Value(line, "localEpoch", &localEpoch) && localEpoch > 0) {
      globalState->rtcBaseEpochSec = (uint32_t)localEpoch;
      globalState->rtcBootMs = millis();
    } else if (getJsonInt32Value(line, "epoch", &epoch) && epoch > 0) {
      if (getJsonInt32Value(line, "tzOffset", &tzOffset)) {
        epoch += tzOffset;
      } else if (epoch > 1000000000) {
        // Alapértelmezett UTC+2 (CEST) eltolás, ha nyers UTC Unix epoch érkezik offset nélkül
        epoch += 7200;
      }
      globalState->rtcBaseEpochSec = (uint32_t)epoch;
      globalState->rtcBootMs = millis();
    }

    uint32_t currentSec = (globalState->rtcBaseEpochSec + (millis() - globalState->rtcBootMs) / 1000) % 86400;
    int h = (int)(currentSec / 3600);
    int m = (int)((currentSec % 3600) / 60);
    int s = (int)(currentSec % 60);

    char timeLog[36];
    snprintf(timeLog, sizeof(timeLog), "[RX] TimeSync: %02d:%02d:%02d", h, m, s);
    addBleDebugLog(timeLog);
    Serial.printf("🕒 [BLE TIME-SYNC] Ora beallitva: %02d:%02d:%02d\n", h, m, s);

    // Válasz küldése a mobilnak
    char reply[96];
    snprintf(reply, sizeof(reply), "{\"type\":\"ACK\",\"cmd\":\"SYNC_TIME\",\"status\":\"ok\",\"time\":\"%02d:%02d\"}", h, m);
    sendBleJson(reply);

    if (globalState->currentScreen == SCREEN_DASHBOARD) {
      updateHeaderOnly(*globalState);
    } else if (globalState->currentScreen == SCREEN_BLE_DEBUG) {
      updateBleDebugLiveFeed(*globalState);
    }
  }
  // 2. PING Parancs
  else if (strcasecmp(cmdStr, "PING") == 0) {
    int32_t ts = 0;
    getJsonInt32Value(line, "ts", &ts);
    char reply[96];
    snprintf(reply, sizeof(reply), "{\"type\":\"PONG\",\"ts\":%ld,\"status\":\"ok\"}", (long)ts);
    sendBleJson(reply);
  }
  // 3. START_SESSION Parancs
  else if (strcasecmp(cmdStr, "START_SESSION") == 0) {
    globalState->isSessionActive = true;
    globalState->sessionStartMs = millis();

    int32_t rodCountVal = 1;
    if (getJsonInt32Value(line, "rodCount", &rodCountVal) && rodCountVal >= 1 && rodCountVal <= 2) {
      globalState->rodCount = (uint8_t)rodCountVal;
    }

    int32_t dist = 0;
    if (getJsonInt32Value(line, "targetDistanceM", &dist) && dist > 0) {
      globalState->targetDistanceM = (uint16_t)dist;
      globalState->rods[0].currentDistanceM = (uint16_t)dist;
    }

    int32_t targetSec = 0;
    if (getJsonInt32Value(line, "targetSec", &targetSec) && targetSec > 0) {
      globalState->rods[0].targetSeconds = (uint32_t)targetSec;
      globalState->targetSeconds = (uint32_t)targetSec;
    }

    // Dobások és számlálók nullázása a botokon
    for (int i = 0; i < 2; i++) {
      globalState->rods[i].isTimerRunning = false;
      globalState->rods[i].isOvertime = false;
      globalState->rods[i].elapsedSec = 0;
      globalState->rods[i].castCount = 0;
    }
    globalState->selectedRodIndex = 0;

    char reply[128];
    snprintf(reply, sizeof(reply), "{\"type\":\"ACK\",\"cmd\":\"START_SESSION\",\"rodCount\":%d,\"status\":\"ok\"}", globalState->rodCount);
    sendBleJson(reply);
    if (globalState->currentScreen == SCREEN_DASHBOARD) {
      drawDashboardScreen(*globalState);
    }
  }
  // 4. STOP_SESSION Parancs
  else if (strcasecmp(cmdStr, "STOP_SESSION") == 0) {
    globalState->isSessionActive = false;
    for (int i = 0; i < 2; i++) {
      globalState->rods[i].isTimerRunning = false;
    }
    globalState->isTimerRunning = false;
    sendBleJson("{\"type\":\"ACK\",\"cmd\":\"STOP_SESSION\",\"status\":\"ok\"}");
    if (globalState->currentScreen == SCREEN_DASHBOARD) {
      drawDashboardScreen(*globalState);
    }
  }
  // 5. START_TIMER Parancs
  else if (strcasecmp(cmdStr, "START_TIMER") == 0) {
    int32_t rodIdx = globalState->selectedRodIndex;
    int32_t rxRod = 0;
    if (getJsonInt32Value(line, "rodIndex", &rxRod) && rxRod >= 0 && rxRod < 2) {
      rodIdx = rxRod;
    }
    int32_t targetSec = 0;
    if (getJsonInt32Value(line, "targetSec", &targetSec) && targetSec > 0) {
      globalState->rods[rodIdx].targetSeconds = (uint32_t)targetSec;
    }
    if (!globalState->isSessionActive) {
      globalState->isSessionActive = true;
      globalState->sessionStartMs = millis();
    }
    globalState->rods[rodIdx].castCount++;
    globalState->rods[rodIdx].elapsedSec = 0;
    globalState->rods[rodIdx].timerStartMs = millis();
    globalState->rods[rodIdx].isTimerRunning = true;
    globalState->rods[rodIdx].isOvertime = false;
    globalState->selectedRodIndex = (uint8_t)rodIdx;

    char ackBuf[96];
    snprintf(ackBuf, sizeof(ackBuf), "{\"type\":\"ACK\",\"cmd\":\"START_TIMER\",\"rodIndex\":%ld,\"status\":\"ok\"}", (long)rodIdx);
    sendBleJson(ackBuf);
    if (globalState->currentScreen == SCREEN_DASHBOARD) {
      drawDashboardScreen(*globalState);
    }
  }
  // 6. STOP_TIMER Parancs
  else if (strcasecmp(cmdStr, "STOP_TIMER") == 0) {
    int32_t rodIdx = globalState->selectedRodIndex;
    int32_t rxRod = 0;
    if (getJsonInt32Value(line, "rodIndex", &rxRod) && rxRod >= 0 && rxRod < 2) {
      rodIdx = rxRod;
    }
    globalState->rods[rodIdx].isTimerRunning = false;
    char ackBuf[96];
    snprintf(ackBuf, sizeof(ackBuf), "{\"type\":\"ACK\",\"cmd\":\"STOP_TIMER\",\"rodIndex\":%ld,\"status\":\"ok\"}", (long)rodIdx);
    sendBleJson(ackBuf);
    if (globalState->currentScreen == SCREEN_DASHBOARD) {
      drawDashboardScreen(*globalState);
    }
  }
  // 7. RESET_TIMER Parancs
  else if (strcasecmp(cmdStr, "RESET_TIMER") == 0) {
    int32_t rodIdx = globalState->selectedRodIndex;
    int32_t rxRod = 0;
    if (getJsonInt32Value(line, "rodIndex", &rxRod) && rxRod >= 0 && rxRod < 2) {
      rodIdx = rxRod;
    }
    globalState->rods[rodIdx].isTimerRunning = false;
    globalState->rods[rodIdx].isOvertime = false;
    globalState->rods[rodIdx].elapsedSec = 0;
    char ackBuf[96];
    snprintf(ackBuf, sizeof(ackBuf), "{\"type\":\"ACK\",\"cmd\":\"RESET_TIMER\",\"rodIndex\":%ld,\"status\":\"ok\"}", (long)rodIdx);
    sendBleJson(ackBuf);
    if (globalState->currentScreen == SCREEN_DASHBOARD) {
      drawDashboardScreen(*globalState);
    }
  }
}

// -------------------------------------------------------------------------
// Nordic UART Service (NUS) RX Callback
// -------------------------------------------------------------------------
class NusRxCallbacks: public BLECharacteristicCallbacks {
  String rxBuffer = "";

  void onWrite(BLECharacteristic* pCharacteristic) override {
    String value = pCharacteristic->getValue();
    if (value.length() > 0) {
      for (size_t i = 0; i < value.length(); i++) {
        char c = value[i];
        if (c == '\n' || c == '\r') {
          if (rxBuffer.length() > 0) {
            processInboundJsonLine(rxBuffer.c_str());
            rxBuffer = "";
          }
        } else {
          rxBuffer += c;
          if (rxBuffer.length() > 512) {
            rxBuffer = ""; // Túlcsordulás védelem
          }
        }
      }
    }
  }
};

// -------------------------------------------------------------------------
// BLE Szerver Kapcsolati Callback-ek
// -------------------------------------------------------------------------
class FeederMateServerCallbacks: public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    isConnected = true;
    addBleDebugLog("[STATUS] Mobil kapcsolodva!");
    if (globalState) {
      globalState->isBleConnected = true;
      if (globalState->currentScreen == SCREEN_DASHBOARD) {
        updateHeaderOnly(*globalState);
      } else if (globalState->currentScreen == SCREEN_BLE_DEBUG) {
        updateBleDebugLiveFeed(*globalState);
      }
    }
    Serial.println("📱 [BLE] Mobil alkalmazas sikeresen CSATLAKOZVA!");
  }

  void onDisconnect(BLEServer* pServer) override {
    isConnected = false;
    addBleDebugLog("[STATUS] Kapcsolat bontva.");
    if (globalState) {
      globalState->isBleConnected = false;
      if (globalState->currentScreen == SCREEN_DASHBOARD) {
        updateHeaderOnly(*globalState);
      } else if (globalState->currentScreen == SCREEN_BLE_DEBUG) {
        updateBleDebugLiveFeed(*globalState);
      }
    }
    Serial.println("📵 [BLE] Mobil kapcsolat MEGSZAKADT. Hirdetes ujrainditasa...");
    pServer->startAdvertising();
  }
};

// -------------------------------------------------------------------------
// Valós Idejű Óra Szinkronizációs Callback (TimeSync - Custom)
// -------------------------------------------------------------------------
class TimeSyncCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) override {
    String value = pCharacteristic->getValue();
    if (value.length() >= 4 && globalState) {
      bleRxPacketCount++;
      const uint8_t* data = (const uint8_t*)value.c_str();
      uint32_t epochSec = (uint32_t)data[0] | ((uint32_t)data[1] << 8) | 
                          ((uint32_t)data[2] << 16) | ((uint32_t)data[3] << 24);
      
      globalState->rtcBaseEpochSec = epochSec;
      globalState->rtcBootMs = millis();

      char timeLog[36];
      snprintf(timeLog, sizeof(timeLog), "[RX] TimeSync: %02d:%02d:%02d", 
               (int)((epochSec % 86400) / 3600), (int)(((epochSec % 86400) % 3600) / 60), (int)(epochSec % 60));
      addBleDebugLog(timeLog);

      if (globalState->currentScreen == SCREEN_DASHBOARD) {
        updateHeaderOnly(*globalState);
      } else if (globalState->currentScreen == SCREEN_BLE_DEBUG) {
        updateBleDebugLiveFeed(*globalState);
      }
    }
  }
};

// -------------------------------------------------------------------------
// Mobil Parancsok Callback (MobileCommandStream - Custom Binary)
// -------------------------------------------------------------------------
class MobileCommandCallbacks: public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* pCharacteristic) override {
    String value = pCharacteristic->getValue();
    if (value.length() > 0 && globalState) {
      bleRxPacketCount++;
      const uint8_t* data = (const uint8_t*)value.c_str();
      uint8_t cmd = data[0];
      char cmdLog[36];

      switch (cmd) {
        case CMD_SET_TIMER: {
          if (value.length() >= 2) {
            uint8_t action = data[1];
            if (action == 1) { // START
              if (!globalState->isSessionActive) {
                globalState->isSessionActive = true;
                globalState->sessionStartMs = millis();
              }
              if (value.length() >= 4) {
                globalState->targetSeconds = (uint16_t)data[2] | ((uint16_t)data[3] << 8);
              }
              globalState->castCount++;
              globalState->elapsedSec = 0;
              globalState->timerStartMs = millis();
              globalState->isTimerRunning = true;
              globalState->isOvertime = false;
              snprintf(cmdLog, sizeof(cmdLog), "[RX] Cmd 0x81: Timer Start");
            } else if (action == 2) { // STOP
              globalState->isTimerRunning = false;
              snprintf(cmdLog, sizeof(cmdLog), "[RX] Cmd 0x81: Timer Stop");
            } else if (action == 3) { // RESET
              globalState->isTimerRunning = false;
              globalState->isOvertime = false;
              globalState->elapsedSec = 0;
              snprintf(cmdLog, sizeof(cmdLog), "[RX] Cmd 0x81: Timer Reset");
            }
            addBleDebugLog(cmdLog);
            if (globalState->currentScreen == SCREEN_DASHBOARD) {
              drawDashboardScreen(*globalState);
            } else if (globalState->currentScreen == SCREEN_BLE_DEBUG) {
              updateBleDebugLiveFeed(*globalState);
            }
          }
          break;
        }

        case CMD_REMOTE_CATCH_SYNC: {
          if (value.length() >= 4) {
            uint16_t grams = (uint16_t)data[1] | ((uint16_t)data[2] << 8);
            uint8_t knIdx = data[3];
            float kg = (float)grams / 1000.0f;

            globalState->fishCount++;
            globalState->totalWeightKg += kg;
            if (knIdx == 0) {
              globalState->keepnet1Fish++;
              globalState->keepnet1WeightKg += kg;
            } else {
              globalState->keepnet2Fish++;
              globalState->keepnet2WeightKg += kg;
            }
            snprintf(cmdLog, sizeof(cmdLog), "[RX] Cmd 0x82: Hal +%.1fkg #%d", kg, knIdx + 1);
            addBleDebugLog(cmdLog);
            if (globalState->currentScreen == SCREEN_DASHBOARD) {
              updateFooterStatsOnly(*globalState);
            } else if (globalState->currentScreen == SCREEN_BLE_DEBUG) {
              updateBleDebugLiveFeed(*globalState);
            }
          }
          break;
        }

        case CMD_SET_ACTIVE_PRESET: {
          if (value.length() >= 2) {
            uint8_t presetIdx = data[1];
            if (presetIdx < getPresetCount()) {
              globalState->activePresetIndex = presetIdx;
              if (value.length() >= 4) {
                globalState->targetSeconds = (uint16_t)data[2] | ((uint16_t)data[3] << 8);
              } else {
                globalState->targetSeconds = getPreset(presetIdx).targetSeconds;
              }
              snprintf(cmdLog, sizeof(cmdLog), "[RX] Cmd 0x83: Preset #%d", presetIdx + 1);
              addBleDebugLog(cmdLog);
              if (globalState->currentScreen == SCREEN_DASHBOARD) {
                drawDashboardScreen(*globalState);
              } else if (globalState->currentScreen == SCREEN_BLE_DEBUG) {
                updateBleDebugLiveFeed(*globalState);
              }
            }
          }
          break;
        }

        default:
          snprintf(cmdLog, sizeof(cmdLog), "[RX] Ismeretlen: 0x%02X", cmd);
          addBleDebugLog(cmdLog);
          break;
      }
    }
  }
};

// -------------------------------------------------------------------------
// BLE GATT Inicializálás
// -------------------------------------------------------------------------
void initBleManager(AppState& state) {
  globalState = &state;
  globalState->isBleConnected = false;

  Serial.println("📡 [BLE INIT] FeederMate BLE GATT Szerver inicializalasa...");
  BLEDevice::init(BLE_DEVICE_NAME);

  // BLE Szerver példányosítás
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new FeederMateServerCallbacks());

  // 1. NORDIC UART SERVICE (NUS - 6E400001) – Flutter Mobilapp Fő Kommunikációs Csatorna
  BLEService* pNusService = pServer->createService(SERVICE_NUS_UUID);

  pCharNusTx = pNusService->createCharacteristic(
    CHAR_NUS_TX_UUID,
    BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharNusTx->addDescriptor(new BLE2902());

  pCharNusRx = pNusService->createCharacteristic(
    CHAR_NUS_RX_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pCharNusRx->setCallbacks(new NusRxCallbacks());

  pNusService->start();

  // 2. Custom Telemetry Service (0x1830)
  BLEService* pTelemetryService = pServer->createService(SERVICE_TELEMETRY_UUID);

  pCharLiveTimer = pTelemetryService->createCharacteristic(
    CHAR_LIVE_TIMER_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharLiveTimer->addDescriptor(new BLE2902());

  pCharLiveKeepnet = pTelemetryService->createCharacteristic(
    CHAR_LIVE_KEEPNET_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pCharLiveKeepnet->addDescriptor(new BLE2902());

  pTelemetryService->start();

  // 3. Custom Event Stream Service (0x1831)
  BLEService* pEventsService = pServer->createService(SERVICE_EVENTS_UUID);

  pCharHwEvents = pEventsService->createCharacteristic(
    CHAR_HW_EVENTS_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_INDICATE
  );
  pCharHwEvents->addDescriptor(new BLE2902());

  pCharMobileCmds = pEventsService->createCharacteristic(
    CHAR_MOBILE_CMDS_UUID,
    BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
  );
  pCharMobileCmds->setCallbacks(new MobileCommandCallbacks());

  pEventsService->start();

  // 4. Custom System Service (0x1833)
  BLEService* pSystemService = pServer->createService(SERVICE_SYSTEM_UUID);

  pCharTimeSync = pSystemService->createCharacteristic(
    CHAR_TIME_SYNC_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pCharTimeSync->setCallbacks(new TimeSyncCallbacks());

  pSystemService->start();

  // Hirdetés indítása (31 bájtos BLE csomaglimit betartásával, hogy a név garantáltan látszódjon!)
  BLEAdvertisementData advData;
  advData.setFlags(0x06); // General Discoverable + BR/EDR Not Supported
  advData.setName(BLE_DEVICE_NAME); // "FeederMate-ESP32" a főközvetítésben (21 bájt)

  BLEAdvertisementData scanResponseData;
  scanResponseData.setCompleteServices(BLEUUID(SERVICE_NUS_UUID)); // NUS 128-bit UUID a Scan Response-ban (18 bájt)

  BLEAdvertising* pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->setAdvertisementData(advData);
  pAdvertising->setScanResponseData(scanResponseData);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06); // iPhone kompatibilitás
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();

  addBleDebugLog("[STATUS] Hirdetes: FeederMate");
  Serial.println("✅ [BLE INIT] Hirdetes elinditva! Nev: 'FeederMate-ESP32', Szolgaltatas: NUS");
}

// -------------------------------------------------------------------------
// Telemetria Közvetítés (1 Hz)
// -------------------------------------------------------------------------
void updateBleTelemetry(const AppState& state) {
  if (!isConnected) return;

  // 1. NUS JSON Heartbeat küldése (1 vs 2 Bot formátum)
  char jsonHeartbeat[384];
  if (state.rodCount == 2) {
    snprintf(jsonHeartbeat, sizeof(jsonHeartbeat),
             "{\"type\":\"HEARTBEAT\",\"rodCount\":2,\"selectedRod\":%u,\"r1\":{\"running\":%s,\"elapsed\":%lu,\"target\":%lu,\"casts\":%lu,\"dist\":%u},\"r2\":{\"running\":%s,\"elapsed\":%lu,\"target\":%lu,\"casts\":%lu,\"dist\":%u},\"fishCount\":%u,\"totalKg\":%.2f,\"k1Kg\":%.2f,\"k2Kg\":%.2f}",
             state.selectedRodIndex,
             state.rods[0].isTimerRunning ? "true" : "false",
             (unsigned long)state.rods[0].elapsedSec,
             (unsigned long)state.rods[0].targetSeconds,
             (unsigned long)state.rods[0].castCount,
             state.rods[0].currentDistanceM,
             state.rods[1].isTimerRunning ? "true" : "false",
             (unsigned long)state.rods[1].elapsedSec,
             (unsigned long)state.rods[1].targetSeconds,
             (unsigned long)state.rods[1].castCount,
             state.rods[1].currentDistanceM,
             state.fishCount,
             state.totalWeightKg,
             state.keepnet1WeightKg,
             state.keepnet2WeightKg);
  } else {
    snprintf(jsonHeartbeat, sizeof(jsonHeartbeat),
             "{\"type\":\"HEARTBEAT\",\"rodCount\":1,\"selectedRod\":0,\"isTimerRunning\":%s,\"elapsedSec\":%lu,\"targetSec\":%lu,\"castCount\":%lu,\"dist\":%u,\"fishCount\":%u,\"totalWeightKg\":%.2f,\"keepnet1Kg\":%.2f,\"keepnet2Kg\":%.2f}",
             state.rods[0].isTimerRunning ? "true" : "false",
             (unsigned long)state.rods[0].elapsedSec,
             (unsigned long)state.rods[0].targetSeconds,
             (unsigned long)state.rods[0].castCount,
             state.rods[0].currentDistanceM,
             state.fishCount,
             state.totalWeightKg,
             state.keepnet1WeightKg,
             state.keepnet2WeightKg);
  }
  sendBleJson(jsonHeartbeat);

  // 2. Custom Binary Telemetria
  if (pCharLiveTimer && pCharLiveKeepnet) {
    uint32_t sessionSec = (state.isSessionActive && state.sessionStartMs > 0) ? 
                          ((millis() - state.sessionStartMs) / 1000) : 0;
    uint8_t selRod = state.selectedRodIndex < 2 ? state.selectedRodIndex : 0;
    uint8_t timerMode = !state.rods[selRod].isTimerRunning ? 0 : (state.rods[selRod].isOvertime ? 2 : 1);

    uint8_t timerPayload[12];
    timerPayload[0] = (uint8_t)(sessionSec & 0xFF);
    timerPayload[1] = (uint8_t)((sessionSec >> 8) & 0xFF);
    timerPayload[2] = (uint8_t)((sessionSec >> 16) & 0xFF);
    timerPayload[3] = (uint8_t)((sessionSec >> 24) & 0xFF);
    timerPayload[4] = (uint8_t)(state.rods[selRod].elapsedSec & 0xFF);
    timerPayload[5] = (uint8_t)((state.rods[selRod].elapsedSec >> 8) & 0xFF);
    timerPayload[6] = (uint8_t)(state.rods[selRod].targetSeconds & 0xFF);
    timerPayload[7] = (uint8_t)((state.rods[selRod].targetSeconds >> 8) & 0xFF);
    timerPayload[8] = selRod; // Aktív Bot index
    timerPayload[9] = timerMode;
    timerPayload[10] = (uint8_t)(state.rods[selRod].castCount & 0xFF);
    timerPayload[11] = 100; // Akkumulátor 100%

    pCharLiveTimer->setValue(timerPayload, 12);
    pCharLiveTimer->notify();

    uint32_t totalGrams = (uint32_t)(state.totalWeightKg * 1000.0f);
    uint16_t k1Grams = (uint16_t)(state.keepnet1WeightKg * 1000.0f);
    uint16_t k2Grams = (uint16_t)(state.keepnet2WeightKg * 1000.0f);

    uint8_t keepnetPayload[10];
    keepnetPayload[0] = (uint8_t)(totalGrams & 0xFF);
    keepnetPayload[1] = (uint8_t)((totalGrams >> 8) & 0xFF);
    keepnetPayload[2] = (uint8_t)((totalGrams >> 16) & 0xFF);
    keepnetPayload[3] = (uint8_t)((totalGrams >> 24) & 0xFF);
    keepnetPayload[4] = (uint8_t)(state.fishCount & 0xFF);
    keepnetPayload[5] = (uint8_t)((state.fishCount >> 8) & 0xFF);
    keepnetPayload[6] = (uint8_t)(k1Grams & 0xFF);
    keepnetPayload[7] = (uint8_t)((k1Grams >> 8) & 0xFF);
    keepnetPayload[8] = (uint8_t)(k2Grams & 0xFF);
    keepnetPayload[9] = (uint8_t)((k2Grams >> 8) & 0xFF);

    pCharLiveKeepnet->setValue(keepnetPayload, 10);
    pCharLiveKeepnet->notify();

    bleTxPacketCount += 2;
  }

  if (globalState && globalState->currentScreen == SCREEN_BLE_DEBUG) {
    updateBleDebugLiveFeed(*globalState);
  }
}

// -------------------------------------------------------------------------
// Hardver Esemény Küldése Mobilnak (KO gomb / Hal naplózás / Teszt)
// -------------------------------------------------------------------------
void sendBleHardwareEvent(uint8_t eventCode, const uint8_t* payload, size_t len) {
  // 1. JSON NUS Esemény küldése
  char jsonEv[192];
  uint32_t nowEpoch = globalState ? (globalState->rtcBaseEpochSec + ((millis() - globalState->rtcBootMs) / 1000)) : 0;

  if (eventCode == EVENT_CAST_STARTED) {
    uint8_t rodIdx = globalState ? globalState->selectedRodIndex : 0;
    snprintf(jsonEv, sizeof(jsonEv), "{\"type\":\"CAST_STARTED\",\"rodIndex\":%u,\"castCount\":%lu,\"targetSec\":%lu,\"dist\":%u,\"ts\":%lu}",
             rodIdx,
             globalState ? (unsigned long)globalState->rods[rodIdx].castCount : 1,
             globalState ? (unsigned long)globalState->rods[rodIdx].targetSeconds : 120,
             globalState ? globalState->rods[rodIdx].currentDistanceM : 65,
             (unsigned long)nowEpoch);
    sendBleJson(jsonEv);
  } else if (eventCode == EVENT_CAST_STOPPED) {
    uint8_t rodIdx = globalState ? globalState->selectedRodIndex : 0;
    snprintf(jsonEv, sizeof(jsonEv), "{\"type\":\"CAST_STOPPED\",\"rodIndex\":%u}", rodIdx);
    sendBleJson(jsonEv);
  } else if (eventCode == EVENT_CATCH_LOGGED) {
    const char* spName = (globalState && globalState->catchSpeciesIndex < getSpeciesCount()) ?
                         getSpecies(globalState->catchSpeciesIndex).name : "Ponty";
    uint8_t rodIdx = globalState ? globalState->selectedRodIndex : 0;
    snprintf(jsonEv, sizeof(jsonEv), "{\"type\":\"CATCH_ADDED\",\"species\":\"%s\",\"weightKg\":%.2f,\"keepnet\":%d,\"rodIndex\":%u,\"totalKg\":%.2f,\"fishCount\":%u,\"ts\":%lu}",
             spName,
             globalState ? globalState->catchTempWeightKg : 2.0f,
             globalState ? (globalState->activeKeepnetIndex + 1) : 1,
             rodIdx,
             globalState ? globalState->totalWeightKg : 0.0f,
             globalState ? globalState->fishCount : 1,
             (unsigned long)nowEpoch);
    sendBleJson(jsonEv);
  } else if (eventCode == EVENT_TEST_PING) {
    snprintf(jsonEv, sizeof(jsonEv), "{\"type\":\"PING\",\"sender\":\"FeederMate-ESP32\",\"ts\":%lu}", (unsigned long)nowEpoch);
    sendBleJson(jsonEv);
  }

  // 2. Custom Binary Esemény küldése
  if (isConnected && pCharHwEvents) {
    uint8_t buffer[32];
    buffer[0] = eventCode;
    if (payload && len > 0) {
      if (len > 31) len = 31;
      memcpy(&buffer[1], payload, len);
    }
    pCharHwEvents->setValue(buffer, len + 1);
    pCharHwEvents->notify();
    bleTxPacketCount++;
  }
}

bool getBleConnectionStatus() {
  return isConnected;
}

// -------------------------------------------------------------------------
// Interaktív Teszt Művelet Végrehajtása
// -------------------------------------------------------------------------
void triggerBleTestAction(int actionIndex, AppState& state) {
  switch (actionIndex) {
    case 0: { // 1. PING TESZT
      sendBleHardwareEvent(EVENT_TEST_PING);
      Serial.println("🧪 [BLE TEST] Ping JSON kiküldve mobilnak!");
      break;
    }
    case 1: { // 2. DOBÁS ESEMÉNY (CAST_STARTED)
      sendBleHardwareEvent(EVENT_CAST_STARTED);
      Serial.println("🧪 [BLE TEST] Dobás (CAST_STARTED) JSON kiküldve mobilnak!");
      break;
    }
    case 2: { // 3. STOP ESEMÉNY (CAST_STOPPED)
      sendBleHardwareEvent(EVENT_CAST_STOPPED);
      Serial.println("🧪 [BLE TEST] Stop (CAST_STOPPED) JSON kiküldve mobilnak!");
      break;
    }
    case 3: { // 4. FOGÁS ESEMÉNY (CATCH_ADDED)
      sendBleHardwareEvent(EVENT_CATCH_LOGGED);
      Serial.println("🧪 [BLE TEST] Fogás (CATCH_ADDED) JSON kiküldve mobilnak!");
      break;
    }
    case 4: { // 5. TELEMETRIA FORCESEND
      updateBleTelemetry(state);
      Serial.println("🧪 [BLE TEST] Telemetria JSON kiküldve mobilnak!");
      break;
    }
    default:
      break;
  }
}
