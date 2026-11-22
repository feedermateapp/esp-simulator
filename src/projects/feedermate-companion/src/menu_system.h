#pragma once

#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>

#include "config.h"
#include "state_types.h"
#include "data_models.h"
#include "display_driver.h"
#include "screen_dashboard.h"
#include "screen_main_menu.h"
#include "screen_presets.h"
#include "screen_subscreens.h"
#include "screen_ble_debug.h"

// =========================================================================
// FeederMate Smart Companion – Képernyő Rendszer Router & Diszpécser
// =========================================================================

void initMenuSystem(Adafruit_ST7789* displayPtr);

void drawScreen(const AppState& state);
void openMainMenu(AppState& state);
void returnToDashboard(AppState& state);
void handleBackAction(AppState& state);

void handleMenuRotary(int delta, AppState& state);
bool handleMenuSelect(AppState& state);
