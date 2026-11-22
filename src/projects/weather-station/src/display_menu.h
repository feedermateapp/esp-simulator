#ifndef DISPLAY_MENU_H
#define DISPLAY_MENU_H

#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

void renderMenu(Adafruit_SSD1306 &display, int selectedIndex, float temp, float press, float alt);

#endif // DISPLAY_MENU_H
