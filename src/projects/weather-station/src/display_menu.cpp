#include "display_menu.h"
#include "config.h"

const char* menuTitles[] = {
  "1. Overview",
  "2. Temperature",
  "3. Barometer",
  "4. Altitude"
};

void renderMenu(Adafruit_SSD1306 &display, int selectedIndex, float temp, float press, float alt) {
  display.clearDisplay();
  
  // Header Bar
  display.fillRect(0, 0, 128, 12, WHITE);
  display.setTextColor(BLACK);
  display.setTextSize(1);
  display.setCursor(4, 2);
  display.print("ESP32 WEATHER");

  // Selected Tab Icon / Index
  display.setCursor(105, 2);
  display.printf("%d/%d", selectedIndex + 1, MENU_ITEMS_COUNT);
  
  // Body Content depending on selected tab
  display.setTextColor(WHITE);
  
  if (selectedIndex == 0) { // Overview
    display.setCursor(4, 18);
    display.printf("Temp:  %.1f C", temp);
    display.setCursor(4, 32);
    display.printf("Press: %.1f hPa", press);
    display.setCursor(4, 46);
    display.printf("Alt:   %.0f m", alt);
  } else if (selectedIndex == 1) { // Temperature View
    display.setCursor(4, 18);
    display.print("TEMPERATURE");
    display.setTextSize(2);
    display.setCursor(12, 32);
    display.printf("%.1f C", temp);
    display.setTextSize(1);
    // Draw visual thermometer bar
    display.drawRect(4, 52, 120, 8, WHITE);
    int fillW = map((int)temp, -10, 50, 0, 116);
    fillW = constrain(fillW, 0, 116);
    display.fillRect(6, 54, fillW, 4, WHITE);
  } else if (selectedIndex == 2) { // Barometer View
    display.setCursor(4, 18);
    display.print("BAROMETER");
    display.setTextSize(2);
    display.setCursor(4, 32);
    display.printf("%.0f hPa", press);
    display.setTextSize(1);
    display.setCursor(4, 52);
    display.print(press > 1013 ? "High Pressure (Sun)" : "Low Pressure (Rain)");
  } else if (selectedIndex == 3) { // Altitude View
    display.setCursor(4, 18);
    display.print("ALTITUDE");
    display.setTextSize(2);
    display.setCursor(12, 32);
    display.printf("%.1f m", alt);
    display.setTextSize(1);
    display.setCursor(4, 52);
    display.print("Ref P0: 1013.25 hPa");
  }

  // Footer Navigation Hint
  display.drawLine(0, 63, 127, 63, WHITE);
  display.display();
}
