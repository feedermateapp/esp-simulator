/**
 * ESP32 Hardware Simulator Type Definitions
 * Covers GPIO pin states, interrupts, I2C devices, sensors, simulation engine,
 * project management data structures, and WiFi/Bluetooth subsystems.
 */

export type PinMode = 'INPUT' | 'OUTPUT' | 'INPUT_PULLUP' | 'INPUT_PULLDOWN' | 'ANALOG';

export type InterruptMode = 'RISING' | 'FALLING' | 'CHANGE' | 'ONLOW' | 'ONHIGH';

export type SimulationState = 'STOPPED' | 'RUNNING' | 'PAUSED' | 'ERROR';

export type PinFunction = 
  | 'GPIO' 
  | 'ADC' 
  | 'DAC' 
  | 'TOUCH' 
  | 'I2C_SDA' 
  | 'I2C_SCL' 
  | 'SPI_MOSI' 
  | 'SPI_MISO' 
  | 'SPI_SCK' 
  | 'UART_TX' 
  | 'UART_RX' 
  | 'PWM';

export interface GPIOPinDefinition {
  pin: number;
  name: string;
  defaultMode: PinMode;
  supportedModes: PinMode[];
  supportedFunctions: PinFunction[];
  isInputOnly: boolean; // GPIO 34, 35, 36, 39 are input only on ESP32
  adcChannel?: number;
  touchChannel?: number;
  dacChannel?: number;
}

export interface GPIOPinState {
  pin: number;
  mode: PinMode;
  digitalValue: 0 | 1;
  analogValue: number; // 0 - 4095
  pwmDuty: number;     // 0 - 255
  voltage: number;     // 0.0 - 3.3V
  label?: string;
  isPwm: boolean;
  lastChanged: number; // timestamp in micros
}

export type PinChangeListener = (pin: number, state: GPIOPinState) => void;
export type InterruptCallback = () => void | Promise<void>;

export interface RegisteredInterrupt {
  pin: number;
  callback: InterruptCallback;
  mode: InterruptMode;
}

export interface II2CDevice {
  address: number;
  name: string;
  readRegister(reg: number): number;
  writeRegister(reg: number, data: number): void;
  receiveBytes(bytes: Uint8Array): void;
  readBytes(count: number): Uint8Array;
}

export interface SerialMessage {
  id: string;
  timestamp: number;
  type: 'TX' | 'RX' | 'SYSTEM' | 'ERROR' | 'BLE';
  text: string;
}

export interface WaveformSample {
  timestamp: number;
  clk: 0 | 1;
  dt: 0 | 1;
  sw: 0 | 1;
}

/* ==========================================================================
   Project Management & Multi-File Data Structures
   ========================================================================== */

export interface ProjectFile {
  id: string;
  name: string;             // e.g. "main.ino", "config.h", "display.cpp"
  path: string;             // relative path: "src/main.ino"
  content: string;          // Source code content
  language: 'cpp' | 'c' | 'json' | 'h' | 'markdown';
  isReadOnly?: boolean;
}

export type PeripheralType = 
  | 'KY040_ROTARY_ENCODER' 
  | 'BMP280_BAROMETER' 
  | 'BME280_BAROMETER'
  | 'SSD1306_OLED' 
  | 'ST7789_DISPLAY'
  | 'LCD1602_I2C' 
  | 'PUSH_BUTTON' 
  | 'LED' 
  | 'POTENTIOMETER' 
  | 'SERVO';

export interface PeripheralConfig {
  id: string;
  type: PeripheralType;
  name: string;
  pins: Record<string, number>;
  config?: Record<string, any>;
}

export interface CircuitConfig {
  board: 'ESP32_DEVKIT_V1' | 'ESP32_S3' | 'ESP32_C3';
  peripherals: PeripheralConfig[];
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  targetBoard: string;
  createdAt: number;
  updatedAt: number;
  mainFile: string;
  tags?: string[];
}

export interface ESPProject {
  metadata: ProjectMetadata;
  circuit: CircuitConfig;
  files: ProjectFile[];
  activeFileId: string;
}

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Starter' | 'Sensors' | 'Display' | 'Complete Project' | 'Wireless';
  icon: string;
  project: ESPProject;
}

/* ==========================================================================
   Wi-Fi & Bluetooth (BLE) Data Structures
   ========================================================================== */

export type WiFiMode = 'OFF' | 'STA' | 'AP' | 'AP_STA';
export type WiFiStatus = 'WL_IDLE_STATUS' | 'WL_NO_SSID_AVAIL' | 'WL_CONNECTED' | 'WL_CONNECT_FAILED' | 'WL_DISCONNECTED';

export interface VirtualWiFiState {
  mode: WiFiMode;
  status: WiFiStatus;
  ssid: string;
  localIP: string;
  subnetMask: string;
  gateway: string;
  rssi: number;
  isSoftAPActive: boolean;
  softAPSSID: string;
  softAPIP: string;
}

export interface VirtualHttpRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'ANY';
  path: string;
  handler: (req: any, res: any) => void;
}

export interface VirtualWebServerState {
  isRunning: boolean;
  port: number;
  routes: VirtualHttpRoute[];
  lastRequestUrl?: string;
  lastResponseStatus?: number;
}

export interface MQTTMessage {
  id: string;
  timestamp: number;
  topic: string;
  payload: string;
  direction: 'PUBLISH' | 'SUBSCRIBE_RECEIVED';
}

export interface BLECharacteristicState {
  uuid: string;
  properties: ('READ' | 'WRITE' | 'NOTIFY' | 'INDICATE')[];
  value: string;
  lastUpdated: number;
}

export interface BLEServiceState {
  uuid: string;
  name?: string;
  characteristics: BLECharacteristicState[];
}

export interface VirtualBLEState {
  isAdvertising: boolean;
  deviceName: string;
  services: BLEServiceState[];
  connectedClients: number;
}
