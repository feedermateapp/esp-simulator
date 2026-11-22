#include "menu_system.h"

// =========================================================================
// FeederMate Smart Companion – Képernyő Rendszer Router & Diszpécser
// =========================================================================

void initMenuSystem(Adafruit_ST7789* displayPtr) {
  initDisplayDriver(displayPtr);
}

void drawScreen(const AppState& state) {
  switch (state.currentScreen) {
    case SCREEN_DASHBOARD:      drawDashboardScreen(state); break;
    case SCREEN_MAIN_MENU:      drawMainMenuScreen(state); break;
    case SCREEN_PRESET_MENU:    drawPresetMenuScreen(state); break;
    case SCREEN_CUSTOM_TIME:    drawCustomTimeScreen(state); break;
    case SCREEN_CATCH_LOG:      drawCatchLogScreen(state); break;
    case SCREEN_KEEPNET:        drawKeepnetScreen(state); break;
    case SCREEN_DISTANCE:       drawDistanceScreen(state); break;
    case SCREEN_SESSION_STATS:  drawSessionStatsScreen(state); break;
    case SCREEN_START_SESSION:  drawStartSessionScreen(state); break;
    case SCREEN_SETTINGS:       drawSettingsScreen(state); break;
    case SCREEN_BLE_DEBUG:      drawBleDebugScreen(state); break;
    case SCREEN_TIME_SETTINGS:  drawTimeSettingsScreen(state); break;
    default:                    drawDashboardScreen(state); break;
  }
}

void openMainMenu(AppState& state) {
  state.currentScreen = SCREEN_MAIN_MENU;
  drawScreen(state);
}

void returnToDashboard(AppState& state) {
  state.currentScreen = SCREEN_DASHBOARD;
  drawScreen(state);
}

void handleBackAction(AppState& state) {
  if (state.currentScreen == SCREEN_DASHBOARD) {
    return;
  } else if (state.currentScreen == SCREEN_MAIN_MENU) {
    returnToDashboard(state);
  } else if (state.currentScreen == SCREEN_PRESET_MENU || state.currentScreen == SCREEN_CUSTOM_TIME) {
    returnToDashboard(state);
  } else if (state.currentScreen == SCREEN_TIME_SETTINGS) {
    state.currentScreen = SCREEN_SETTINGS;
    drawSettingsScreen(state);
  } else {
    // Al-képernyőkről vissza a Főmenübe
    openMainMenu(state);
  }
}

void handleMenuRotary(int delta, AppState& state) {
  switch (state.currentScreen) {
    case SCREEN_MAIN_MENU:
      handleMainMenuRotary(delta, state);
      break;
    case SCREEN_PRESET_MENU:
      handlePresetMenuRotary(delta, state);
      break;
    case SCREEN_CUSTOM_TIME:
      handleCustomTimeRotary(delta, state);
      break;
    case SCREEN_CATCH_LOG:
      handleCatchLogRotary(delta, state);
      break;
    case SCREEN_DISTANCE:
      handleDistanceRotary(delta, state);
      break;
    case SCREEN_START_SESSION:
      handleStartSessionRotary(delta, state);
      break;
    case SCREEN_SETTINGS:
      handleSettingsRotary(delta, state);
      break;
    case SCREEN_BLE_DEBUG:
      handleBleDebugRotary(delta, state);
      break;
    case SCREEN_TIME_SETTINGS:
      handleTimeSettingsRotary(delta, state);
      break;
    default:
      break;
  }
}

bool handleMenuSelect(AppState& state) {
  switch (state.currentScreen) {
    case SCREEN_MAIN_MENU: {
      bool ok = handleMainMenuSelect(state);
      drawScreen(state);
      return ok;
    }
    case SCREEN_PRESET_MENU: {
      return handlePresetMenuSelect(state);
    }
    case SCREEN_CUSTOM_TIME: {
      return handleCustomTimeSelect(state);
    }
    case SCREEN_CATCH_LOG: {
      bool ok = handleCatchLogSelect(state);
      drawScreen(state);
      return ok;
    }
    case SCREEN_KEEPNET: {
      return handleKeepnetSelect(state);
    }
    case SCREEN_DISTANCE: {
      bool ok = handleDistanceSelect(state);
      drawScreen(state);
      return ok;
    }
    case SCREEN_START_SESSION: {
      return handleStartSessionSelect(state);
    }
    case SCREEN_SETTINGS: {
      return handleSettingsSelect(state);
    }
    case SCREEN_BLE_DEBUG: {
      return handleBleDebugSelect(state);
    }
    case SCREEN_TIME_SETTINGS: {
      return handleTimeSettingsSelect(state);
    }
    default:
      break;
  }
  return false;
}
