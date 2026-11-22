#pragma once

#include "state_types.h"
#include "data_models.h"
#include "display_driver.h"
#include "config.h"

// =========================================================================
// FeederMate Smart Companion – Főmenü Képernyő Modul (3 Nagy Kártya)
// =========================================================================

void drawMainMenuScreen(const AppState& state);
void handleMainMenuRotary(int delta, AppState& state);
bool handleMainMenuSelect(AppState& state);
