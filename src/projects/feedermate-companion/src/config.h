#pragma once

#include <Arduino.h>

// =========================================================================
// FeederMate Smart Companion – Lábkiosztás & Rendszer Konfiguráció
// =========================================================================

// ST7789 SPI Kijelző Lábak
#define PIN_TFT_CS        27  // SPI Chip Select (TFT_CS)
#define PIN_TFT_DC        4   // Data / Command (TFT_DC)
#define PIN_TFT_RST       25  // Hardware Reset (TFT_RST)
#define PIN_TFT_MOSI      23  // SPI MOSI (SDA)
#define PIN_TFT_SCLK      18  // SPI Clock (SCL)

// EC11 Forgó Jeladó (Rotary Encoder)
#define PIN_ROTARY_CLK    19  // Rotary Phase A (CLK)
#define PIN_ROTARY_DT     21  // Rotary Phase B (DT)
#define PIN_ROTARY_SW     22  // Rotary Beépített Nyomógomb (SW)

// Fizikai Nyomógombok
#define PIN_CAST_BTN      14  // 1. Gomb (KO / Bot #1 Dobás Stopper)
#define PIN_CAST2_BTN     33  // 3. Gomb (Bot #2 Dobás / Botváltó Gomb - D33)
#define PIN_MENU_BTN      26  // Sárga Gomb (Főmenü Megnyitása)

// Rendszer Állapotjelzők
#define PIN_ALERT_LED     13  // Külső Riasztó LED
#define PIN_ONBOARD_LED   2   // ESP32 Belső Kék LED

// =========================================================================
// Modern Smooth UI Színpaletta (RGB565)
// =========================================================================
#define COLOR_BG            0x0000  // Mély Fekete (#000000)
#define COLOR_PANEL         0x10A2  // Sötét Antracitszürke (#111418)
#define COLOR_CARD_BG       0x18C3  // Prémium Kártya Háttér (#181B22)
#define COLOR_SELECTED_BG   0x2965  // Kijelölt Kártya Kiemelés (#282E3A)
#define COLOR_HEADER_BG     0x0841  // Fejléc és Lábléc Sáv (#0A0C10)
#define COLOR_BORDER_SUBTLE 0x2124  // Finom Kártya Keret
#define COLOR_ACCENT        0x057F  // Élénk Feeder Kék (#00ACF8)
#define COLOR_SUCCESS       0x2648  // Neon Smaragdzöld (#24C948)
#define COLOR_SUCCESS_BG    0x0220  // Sötétzöld Pill Háttér (#052408)
#define COLOR_WARN          0xFD20  // Meleg Borostyánsárga (#FFA500)
#define COLOR_DANGER        0xF9A4  // Élénk Crimson Piros (#F83030)
#define COLOR_DANGER_BG     0x3800  // Sötétpiros Pill Háttér (#380000)
#define COLOR_WHITE         0xFFFF  // Tiszta Hófehér (#FFFFFF)
#define COLOR_TEXT_MUTED    0x8C71  // Finom Szürke (#8A92A0)
#define COLOR_YELLOW        0xFFE0  // Élénksárga (#FFE600)
