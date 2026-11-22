#pragma once

#include <Arduino.h>
#include "state_types.h"

// =========================================================================
// FeederMate Smart Companion – BLE GATT Kezelő Modul
// =========================================================================

#define BLE_DEVICE_NAME             "FeederMate-ESP32"

// Nordic UART Service (NUS) UUID-k (Flutter Mobilapp Kompatibilitás)
#define SERVICE_NUS_UUID            "6E400001-B5A3-F393-E0A9-E50E24DCCA9E"
#define CHAR_NUS_RX_UUID            "6E400002-B5A3-F393-E0A9-E50E24DCCA9E" // App -> ESP32 (Write)
#define CHAR_NUS_TX_UUID            "6E400003-B5A3-F393-E0A9-E50E24DCCA9E" // ESP32 -> App (Notify)

// Szolgáltatás UUID-k (FeederMate Custom 128-bit)
#define SERVICE_TELEMETRY_UUID      "00001830-F33D-4EA7-8E2A-FEEDE8000000"
#define CHAR_LIVE_TIMER_UUID        "00002A01-F33D-4EA7-8E2A-FEEDE8000000"
#define CHAR_LIVE_KEEPNET_UUID      "00002A02-F33D-4EA7-8E2A-FEEDE8000000"

#define SERVICE_EVENTS_UUID         "00001831-F33D-4EA7-8E2A-FEEDE8000000"
#define CHAR_HW_EVENTS_UUID         "00002B01-F33D-4EA7-8E2A-FEEDE8000000"
#define CHAR_MOBILE_CMDS_UUID       "00002B02-F33D-4EA7-8E2A-FEEDE8000000"

#define SERVICE_SYSTEM_UUID         "00001833-F33D-4EA7-8E2A-FEEDE8000000"
#define CHAR_TIME_SYNC_UUID         "00002D02-F33D-4EA7-8E2A-FEEDE8000000"

// Esemény Kódok (ESP32 -> Mobil irány)
#define EVENT_CAST_STARTED          0x01
#define EVENT_MISSED_BITE           0x02
#define EVENT_CATCH_LOGGED          0x03
#define EVENT_CAST_STOPPED          0x04
#define EVENT_TEST_PING             0xFF

// Mobil Parancs Kódok (Mobil -> ESP32 irány)
#define CMD_SET_TIMER               0x81
#define CMD_REMOTE_CATCH_SYNC       0x82
#define CMD_SET_ACTIVE_PRESET       0x83

// BLE Interfész Metódusok
void initBleManager(AppState& state);
void updateBleTelemetry(const AppState& state);
void sendBleHardwareEvent(uint8_t eventCode, const uint8_t* payload = nullptr, size_t len = 0);
void sendBleJson(const char* jsonStr);
void processBleIncoming(AppState& state);
bool getBleConnectionStatus();

// BLE Debug & Tesztelés Segédfüggvények
void addBleDebugLog(const char* logMsg);
int getBleLogCount();
const char* getBleLog(int index);
uint32_t getBleTxPacketCount();
uint32_t getBleRxPacketCount();
void triggerBleTestAction(int actionIndex, AppState& state);
