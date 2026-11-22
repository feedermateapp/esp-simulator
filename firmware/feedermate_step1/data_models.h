#pragma once

#include "state_types.h"
#include "config.h"

// =========================================================================
// FeederMate Smart Companion – Statikus Adatbázisok & Getterek
// =========================================================================

int getPresetCount();
const PresetItem& getPreset(int index);

int getDistancePresetCount();
const DistancePresetItem& getDistancePreset(int index);

int getSpeciesCount();
const FishSpecies& getSpecies(int index);

int getMainMenuCount();
const MainMenuItem& getMainMenuItem(int index);
