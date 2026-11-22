// =========================================================================
// ESP32 Weather Station & Rotary Encoder Menu
// Peripherals: SSD1306 OLED (I2C: 0x3C), BMP280 (I2C: 0x76), KY-040 Rotary
// =========================================================================

#include <Wire.h>
#include "config.h"
#include "display_menu.h"

// Globals
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire);
Adafruit_BMP280 bmp;

volatile int menuIndex = 0;
volatile bool menuChanged = true;
int lastEncoderPos = 0;
unsigned long lastSensorRead = 0;

float currentTemp = 24.5;
float currentPressure = 1013.25;
float currentAltitude = 0.0;

// Interrupt Service Routine for Rotary Encoder CLK
void IRAM_ATTR isrRotaryCLK() {
  int clkState = digitalRead(PIN_ROTARY_CLK);
  int dtState = digitalRead(PIN_ROTARY_DT);
  
  if (clkState == LOW) {
    if (dtState == HIGH) {
      menuIndex = (menuIndex + 1) % MENU_ITEMS_COUNT;
    } else {
      menuIndex = (menuIndex - 1 + MENU_ITEMS_COUNT) % MENU_ITEMS_COUNT;
    }
    menuChanged = true;
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("=====================================");
  Serial.println("ESP32 Weather Station & Menu Starting");
  Serial.println("=====================================");

  // Pin modes
  pinMode(PIN_ROTARY_CLK, INPUT_PULLUP);
  pinMode(PIN_ROTARY_DT, INPUT_PULLUP);
  pinMode(PIN_ROTARY_SW, INPUT_PULLUP);
  pinMode(PIN_BTN_BACK, INPUT_PULLUP);
  pinMode(PIN_LED_STATUS, OUTPUT);

  // Attach Interrupt for smooth rotary navigation
  attachInterrupt(digitalPinToInterrupt(PIN_ROTARY_CLK), isrRotaryCLK, FALLING);

  // Initialize I2C Bus (SDA = 21, SCL = 22)
  Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);

  // Initialize OLED Display
  if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDR)) {
    Serial.println("[ERROR] SSD1306 OLED initialization failed!");
  } else {
    Serial.println("[OK] SSD1306 OLED initialized (128x64)");
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(10, 20);
    display.println("ESP32 Station Init...");
    display.display();
  }

  // Initialize BMP280 Barometer
  if (!bmp.begin(BMP280_I2C_ADDR)) {
    Serial.println("[ERROR] BMP280 Sensor not found at 0x76!");
  } else {
    Serial.println("[OK] BMP280 Barometer initialized");
  }

  delay(500);
  renderMenu(display, menuIndex, currentTemp, currentPressure, currentAltitude);
}

void loop() {
  // Read sensor every 1000 ms
  if (millis() - lastSensorRead >= 1000) {
    lastSensorRead = millis();
    currentTemp = bmp.readTemperature();
    currentPressure = bmp.readPressure() / 100.0F; // Pa to hPa
    currentAltitude = bmp.readAltitude(1013.25);
    
    // Toggle status LED to indicate live heartbeat
    digitalWrite(PIN_LED_STATUS, !digitalRead(PIN_LED_STATUS));
    
    // Print telemetry to Serial Monitor
    Serial.printf("[SENSOR] Temp: %.2f C | Press: %.2f hPa | Alt: %.1f m\n", 
                  currentTemp, currentPressure, currentAltitude);
    
    menuChanged = true;
  }

  // Check Rotary Switch Button
  if (digitalRead(PIN_ROTARY_SW) == LOW) {
    Serial.printf("[BUTTON] Rotary Push clicked at Menu: %d\n", menuIndex);
    toneBeep();
    delay(200); // Debounce
  }

  // Re-render display if menu or sensor values updated
  if (menuChanged) {
    menuChanged = false;
    renderMenu(display, menuIndex, currentTemp, currentPressure, currentAltitude);
  }

  delay(20);
}

void toneBeep() {
  digitalWrite(PIN_LED_STATUS, HIGH);
  delay(50);
  digitalWrite(PIN_LED_STATUS, LOW);
}
