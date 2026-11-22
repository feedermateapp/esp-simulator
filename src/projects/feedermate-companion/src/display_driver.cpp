#include "display_driver.h"

static Adafruit_ST7789* tft = nullptr;

void initDisplayDriver(Adafruit_ST7789* displayPtr) {
  tft = displayPtr;
}

Adafruit_ST7789* getTft() {
  return tft;
}

void drawThickRoundRect(int x, int y, int w, int h, int r, int thickness, uint16_t color) {
  if (!tft) return;
  for (int i = 0; i < thickness; i++) {
    tft->drawRoundRect(x + i, y + i, w - (2 * i), h - (2 * i), r, color);
  }
}
