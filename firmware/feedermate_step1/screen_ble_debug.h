#pragma once

#include "state_types.h"
#include "data_models.h"
#include "display_driver.h"
#include "config.h"

// =========================================================================
// FeederMate Smart Companion – Bluetooth Debug & Kétirányú Teszt Képernyő
// =========================================================================

void drawBleDebugScreen(const AppState& state);
void updateBleDebugLiveFeed(const AppState& state);
void updateBleDebugSelectorOnly(const AppState& state);
void handleBleDebugRotary(int delta, AppState& state);
bool handleBleDebugSelect(AppState& state);
