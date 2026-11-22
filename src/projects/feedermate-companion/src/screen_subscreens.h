#pragma once

#include "state_types.h"
#include "data_models.h"
#include "display_driver.h"
#include "config.h"

// =========================================================================
// FeederMate Smart Companion – Al-képernyők (Catch Log, Keepnet, Distance, Stats, Start Session, Settings)
// =========================================================================

// Halfogás Rögzítő
void drawCatchLogScreen(const AppState& state);
void updateCatchWeightDigitsOnly(const AppState& state);
void handleCatchLogRotary(int delta, AppState& state);
bool handleCatchLogSelect(AppState& state);

// Száktartalom és 20kg Limit
void drawKeepnetScreen(const AppState& state);
bool handleKeepnetSelect(AppState& state);

// Etetési Távolság
void drawDistanceScreen(const AppState& state);
void updateDistanceDigitsOnly(const AppState& state);
void handleDistanceRotary(int delta, AppState& state);
bool handleDistanceSelect(AppState& state);

// Session Statisztika
void drawSessionStatsScreen(const AppState& state);

// Új Horgászat Indítása / Nullázás
void drawStartSessionScreen(const AppState& state);
void updateStartSessionFieldsOnly(const AppState& state);
void handleStartSessionRotary(int delta, AppState& state);
bool handleStartSessionSelect(AppState& state);

// Rendszer Beállítások
void drawSettingsScreen(const AppState& state);
void handleSettingsRotary(int delta, AppState& state);
bool handleSettingsSelect(AppState& state);

// Kézi Pontos Óra Beállító (HH:MM)
void drawTimeSettingsScreen(const AppState& state);
void updateTimeSettingsDigitsOnly(const AppState& state);
void handleTimeSettingsRotary(int delta, AppState& state);
bool handleTimeSettingsSelect(AppState& state);

