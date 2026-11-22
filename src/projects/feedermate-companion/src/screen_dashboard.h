#pragma once

#include "state_types.h"
#include "data_models.h"
#include "display_driver.h"
#include "config.h"

// =========================================================================
// FeederMate Smart Companion – Pro Dashboard Képernyő Modul
// =========================================================================

void drawDashboardScreen(const AppState& state);
void updateHeaderOnly(const AppState& state);
void updateTimerDigitsOnly(const AppState& state);
void updateProgressBarOnly(const AppState& state);
void updateFooterStatsOnly(const AppState& state);
void updateRightWidgetsOnly(const AppState& state);
void updateSessionWidgetOnly(const AppState& state);
void updateHeroCardBorderOnly(const AppState& state);
void updateRotaryFineTuneFeedback(const AppState& state);



