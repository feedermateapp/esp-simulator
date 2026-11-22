// SSD1306 OLED Graphics Animation
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire);

int ballX = 64, ballY = 32;
int speedX = 2, speedY = 2;
int radius = 5;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.display();
}

void loop() {
  display.clearDisplay();
  
  // Draw bouncing ball
  display.fillCircle(ballX, ballY, radius, WHITE);
  
  // Draw border
  display.drawRect(0, 0, 128, 64, WHITE);
  
  // Draw text
  display.setTextSize(1);
  display.setTextColor(WHITE);
  display.setCursor(4, 4);
  display.print("Bouncing Ball");
  
  display.display();
  
  // Physics update
  ballX += speedX;
  ballY += speedY;
  
  if (ballX - radius <= 1 || ballX + radius >= 126) speedX = -speedX;
  if (ballY - radius <= 1 || ballY + radius >= 62) speedY = -speedY;
  
  delay(30);
}
