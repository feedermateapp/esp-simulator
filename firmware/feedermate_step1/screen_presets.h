#pragma once

#include "state_types.h"
#include "data_models.h"
#include "display_driver.h"
#include "config.h"

// =========================================================================
// FeederMate Smart Companion – Taktikai Presetek & Custom Idő Modul
// =========================================================================

void drawPresetMenuScreen(const AppState& state);
void updatePresetTabHeaderOnly(const AppState& state);
void drawCustomTimeScreen(const AppState& state);
void updateCustomTimeDigitsOnly(const AppState& state);

void handlePresetMenuRotary(int delta, AppState& state);
bool handlePresetMenuSelect(AppState& state);

void handleCustomTimeRotary(int delta, AppState& state);
bool handleCustomTimeSelect(AppState& state);
