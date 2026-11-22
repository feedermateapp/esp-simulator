#pragma once

#include <Arduino.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7789.h>
#include "config.h"

// =========================================================================
// FeederMate Smart Companion – Kijelző Driver & Grafikai Segédek
// =========================================================================

void initDisplayDriver(Adafruit_ST7789* displayPtr);
Adafruit_ST7789* getTft();

// 3px Vastagságú Lekerekített Téglalap
void drawThickRoundRect(int x, int y, int w, int h, int r, int thickness, uint16_t color);
