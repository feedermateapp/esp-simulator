#pragma once

#include <Arduino.h>
#include "config.h"
#include "state_types.h"
#include "menu_system.h"

// =========================================================================
// FeederMate Smart Companion – Bemenet Kezelő (Rotary ISR + Debounce Gombok)
// =========================================================================

void initInputHandler();
void processInputs(AppState& appState);
