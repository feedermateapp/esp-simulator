// KY-040 Rotary Encoder Counter Demo
#define PIN_CLK 18
#define PIN_DT  19
#define PIN_SW  23
#define PIN_LED 2

volatile long counter = 0;
volatile bool rotated = false;

void IRAM_ATTR onRotate() {
  if (digitalRead(PIN_CLK) == LOW) {
    if (digitalRead(PIN_DT) == HIGH) {
      counter++;
    } else {
      counter--;
    }
    rotated = true;
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("KY-040 Rotary Encoder Demo Starting...");
  
  pinMode(PIN_CLK, INPUT_PULLUP);
  pinMode(PIN_DT, INPUT_PULLUP);
  pinMode(PIN_SW, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  
  attachInterrupt(digitalPinToInterrupt(PIN_CLK), onRotate, FALLING);
}

void loop() {
  if (rotated) {
    rotated = false;
    Serial.printf("Encoder Position: %ld\n", counter);
    digitalWrite(PIN_LED, counter % 2 == 0 ? HIGH : LOW);
  }
  
  if (digitalRead(PIN_SW) == LOW) {
    Serial.println("Button Clicked! Resetting counter to 0.");
    counter = 0;
    delay(200);
  }
  
  delay(10);
}
