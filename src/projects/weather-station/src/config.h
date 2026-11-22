#ifndef CONFIG_H
#define CONFIG_H

// --- Pin Assignments ---
#define PIN_I2C_SDA      21
#define PIN_I2C_SCL      22

#define PIN_BMP_SDA      25
#define PIN_BMP_SCL      26

#define PIN_ROTARY_CLK   18
#define PIN_ROTARY_DT    19
#define PIN_ROTARY_SW    23

#define PIN_BTN_BACK     14
#define PIN_LED_STATUS   13

// --- I2C Addresses ---
#define OLED_I2C_ADDR    0x3C
#define BMP280_I2C_ADDR  0x76

// --- Display Configuration ---
#define SCREEN_WIDTH     128
#define SCREEN_HEIGHT    64
#define OLED_RESET       -1

// --- Menu Configuration ---
#define MENU_ITEMS_COUNT 4

#endif // CONFIG_H
