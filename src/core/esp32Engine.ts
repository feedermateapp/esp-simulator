import { SimulationState, SerialMessage, ProjectFile } from '../types/esp32';
import { gpioManager } from './gpioManager';
import { i2cBus } from './i2cBus';
import { bmp280 } from './devices/bmp280';
import { ssd1306 } from './devices/ssd1306';
import { st7789 } from './devices/st7789';
import { rotaryEncoder } from './devices/rotaryEncoder';
import { virtualWifi } from './virtualWifi';
import { virtualBle } from './virtualBle';
import { transpileArduinoCpp } from './cppTranspiler';
import { logger } from '../utils/logger';

export type SerialOutputListener = (msg: SerialMessage) => void;
export type SimulationStateListener = (state: SimulationState) => void;

function formatPrintf(format: string, ...args: any[]): string {
  let i = 0;
  return String(format).replace(/%([0\s\+\-])?(\d+)?(\.(\d+))?([dfscuxX%])/g, (match, flag, width, _p1, precision, specifier) => {
    if (specifier === '%') return '%';
    if (i >= args.length) return match;
    const arg = args[i++];
    if (specifier === 'd' || specifier === 'u' || specifier === 'x' || specifier === 'X') {
      let num = Math.floor(Number(arg));
      let s = (specifier === 'x') ? num.toString(16) : (specifier === 'X') ? num.toString(16).toUpperCase() : String(num);
      if (width) {
        const w = parseInt(width, 10);
        const padChar = (flag === '0') ? '0' : ' ';
        s = s.padStart(w, padChar);
      }
      return s;
    }
    if (specifier === 'f') {
      const p = precision !== undefined ? parseInt(precision, 10) : 2;
      let s = Number(arg).toFixed(p);
      if (width) {
        const w = parseInt(width, 10);
        const padChar = (flag === '0') ? '0' : ' ';
        s = s.padStart(w, padChar);
      }
      return s;
    }
    if (specifier === 's' || specifier === 'c') {
      let s = String(arg);
      if (width) {
        const w = parseInt(width, 10);
        s = s.padStart(w, ' ');
      }
      return s;
    }
    return String(arg);
  });
}

function sprintf(first: any, second?: any, ...rest: any[]): string {
  if (typeof first === 'string' && (first.includes('%') || second === undefined)) {
    return formatPrintf(first, second, ...rest);
  }
  return formatPrintf(second, ...rest);
}

export class ESP32Engine {
  private state: SimulationState = 'STOPPED';
  private speedMultiplier: number = 1.0;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private loopTimerId: any = null;

  private serialListeners: Set<SerialOutputListener> = new Set();
  private stateListeners: Set<SimulationStateListener> = new Set();

  // User sketch callbacks
  private userSetup: (() => void | Promise<void>) | null = null;
  private userLoop: (() => void | Promise<void>) | null = null;

  constructor() {
    this.initHardwareBindings();
  }

  private initHardwareBindings() {
    // SSD1306 and BMP280 are auto-registered on i2cBus
  }

  public getState(): SimulationState {
    return this.state;
  }

  public setSpeedMultiplier(mult: number) {
    this.speedMultiplier = Math.max(0.1, Math.min(10.0, mult));
  }

  public onSerialMessage(listener: SerialOutputListener): () => void {
    this.serialListeners.add(listener);
    return () => this.serialListeners.delete(listener);
  }

  public onStateChange(listener: SimulationStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  private notifyState(state: SimulationState) {
    this.state = state;
    this.stateListeners.forEach(l => l(state));
  }

  private emitSerial(text: string, type: 'TX' | 'RX' | 'SYSTEM' | 'ERROR' = 'TX') {
    const msg: SerialMessage = {
      id: 'ser_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      timestamp: Date.now(),
      type,
      text
    };
    this.serialListeners.forEach(l => l(msg));
  }

  // --- Arduino Core API Sandbox Factory ---

  public createSandboxContext() {
    const self = this;

    const Serial = {
      begin: (baud: number) => {
        self.emitSerial(`[Serial.begin] Port nyitva ${baud} baud sebességgel.`, 'SYSTEM');
        logger.info('ENGINE', `Serial.begin(${baud}) initialized`);
      },
      print: (text: any) => {
        self.emitSerial(String(text), 'TX');
      },
      println: (text: any = '') => {
        self.emitSerial(String(text), 'TX');
      },
      printf: (format: string, ...args: any[]) => {
        const formatted = formatPrintf(format, ...args);
        self.emitSerial(formatted, 'TX');
      },
      available: () => 0,
      read: () => -1
    };

    const Wire = {
      begin: (sda: number = 21, scl: number = 22) => i2cBus.begin(sda, scl),
      beginTransmission: (addr: number) => i2cBus.beginTransmission(addr),
      write: (data: any) => i2cBus.write(data),
      endTransmission: (stop?: boolean) => i2cBus.endTransmission(stop),
      requestFrom: (addr: number, qty: number) => i2cBus.requestFrom(addr, qty),
      read: () => i2cBus.read(),
      available: () => i2cBus.available(),
      getDevice: (addr: number) => i2cBus.getDevice(addr)
    };

    const SPI = {
      begin: (_sclk?: number, _miso?: number, _mosi?: number, _ss?: number) => {},
      end: () => {},
      setFrequency: (_freq: number) => {},
      setClockDivider: (_div: number) => {},
      setDataMode: (_mode: number) => {},
      setBitOrder: (_order: number) => {},
      transfer: (data: number) => data,
      transfer16: (data: number) => data,
      transfer32: (data: number) => data,
      write: (_data: any) => {},
      write16: (_data: number) => {},
      write32: (_data: number) => {}
    };

    const pinMode = (pin: number, mode: any) => gpioManager.setPinMode(pin, mode);
    const digitalWrite = (pin: number, val: any) => gpioManager.writeDigital(pin, val);
    const digitalRead = (pin: number) => gpioManager.readDigital(pin);
    const analogRead = (pin: number) => gpioManager.readAnalog(pin);
    const analogWrite = (pin: number, duty: number) => gpioManager.writePwm(pin, duty);

    const attachInterrupt = (pin: number, isr: () => void, mode: any) => {
      gpioManager.attachInterrupt(pin, isr, mode);
    };
    const detachInterrupt = (pin: number) => gpioManager.detachInterrupt(pin);

    const digitalPinToInterrupt = (pin: number) => pin;

    const millis = () => {
      return Math.floor((performance.now() - self.startTime) * self.speedMultiplier);
    };

    const micros = () => {
      return Math.floor((performance.now() - self.startTime) * 1000 * self.speedMultiplier);
    };

    const delay = (ms: number): Promise<void> => {
      const adjustedMs = ms / self.speedMultiplier;
      return new Promise(resolve => setTimeout(resolve, Math.max(1, adjustedMs)));
    };

    const delayMicroseconds = (us: number): Promise<void> => {
      const ms = (us / 1000) / self.speedMultiplier;
      return new Promise(resolve => setTimeout(resolve, Math.max(0.1, ms)));
    };

    const map = (x: number, in_min: number, in_max: number, out_min: number, out_max: number) => {
      return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
    };

    const constrain = (amt: number, low: number, high: number) => {
      return Math.max(low, Math.min(high, amt));
    };

    return {
      Serial,
      Wire,
      SPI,
      pinMode,
      digitalWrite,
      digitalRead,
      analogRead,
      analogWrite,
      attachInterrupt,
      detachInterrupt,
      digitalPinToInterrupt,
      millis,
      micros,
      delay,
      delayMicroseconds,
      map,
      constrain,
      min: Math.min,
      max: Math.max,
      abs: Math.abs,
      sqrt: Math.sqrt,
      round: Math.round,
      // String / C-Stdlib helpers
      strlen: (str: any) => (str !== null && str !== undefined ? String(str).length : 0),
      strcmp: (s1: any, s2: any) => {
        const a = String(s1 || ''), b = String(s2 || '');
        return a === b ? 0 : (a > b ? 1 : -1);
      },
      strcpy: (_dest: any, src: any) => String(src || ''),
      strcat: (dest: any, src: any) => String(dest || '') + String(src || ''),
      snprintf: sprintf,
      // Time / RTC helpers
      getHour: () => new Date().getHours(),
      getMinute: () => new Date().getMinutes(),
      getSecond: () => new Date().getSeconds(),
      // Device helpers
      i2cBus,
      bmp280,
      ssd1306,
      st7789,
      rotaryEncoder,
      virtualWifi,
      virtualBle,
      formatPrintf,
      sprintf,
      // Constants
      HIGH: 1,
      LOW: 0,
      INPUT: 'INPUT',
      OUTPUT: 'OUTPUT',
      INPUT_PULLUP: 'INPUT_PULLUP',
      INPUT_PULLDOWN: 'INPUT_PULLDOWN',
      RISING: 'RISING',
      FALLING: 'FALLING',
      CHANGE: 'CHANGE',
      WHITE: 1,
      BLACK: 0,
      SSD1306_SWITCHCAPVCC: 0x02,
      ST77XX_BLACK: 0x0000,
      ST77XX_WHITE: 0xFFFF,
      ST77XX_RED: 0xF800,
      ST77XX_GREEN: 0x07E0,
      ST77XX_BLUE: 0x001F,
      ST77XX_YELLOW: 0xFFE0,
      ST77XX_ORANGE: 0xFD20,
      ST77XX_CYAN: 0x07FF,
      ST77XX_MAGENTA: 0xF81F,
      ST77XX_LIGHTGREY: 0xD69A,
      ST77XX_DARKGREY: 0x39E7,
      TFT_BLACK: 0x0000,
      TFT_WHITE: 0xFFFF,
      TFT_RED: 0xF800,
      TFT_GREEN: 0x07E0,
      TFT_BLUE: 0x001F,
      TFT_YELLOW: 0xFFE0,
      TFT_ORANGE: 0xFD20,
      TFT_CYAN: 0x07FF,
      TFT_MAGENTA: 0xF81F,
      TFT_LIGHTGREY: 0xD69A,
      TFT_DARKGREY: 0x39E7
    };
  }

  // --- Execution Lifecycle ---

  public async start(sketchCode: string, projectFiles: ProjectFile[] = []) {
    this.stop();
    this.startTime = performance.now();
    this.isRunning = true;
    this.isPaused = false;
    this.notifyState('RUNNING');

    this.emitSerial('=== ESP32 Virtual MCU Booting ===', 'SYSTEM');
    this.emitSerial('Clock: 240MHz Xtensa LX6 Dual-Core (Simulated)', 'SYSTEM');

    try {
      // 1. Transpile C++ into executable JavaScript
      const jsCode = transpileArduinoCpp(sketchCode, projectFiles);
      logger.debug('VM', 'Generated JS Code:', jsCode);

      // 2. Build executable sandbox
      const sandbox = this.createSandboxContext();
      
      // 3. Inject standard Arduino classes (Adafruit_SSD1306, Adafruit_ST7789, TFT_eSPI, Adafruit_BMP280, WiFi, etc.) and user code
      const scriptBody = `
        const {
          Serial, Wire, SPI, pinMode, digitalWrite, digitalRead, analogRead, analogWrite,
          attachInterrupt, detachInterrupt, digitalPinToInterrupt, millis, micros, delay,
          delayMicroseconds, map, constrain, min, max, abs, sqrt, round,
          i2cBus, bmp280, ssd1306, st7789, rotaryEncoder, virtualWifi, virtualBle, formatPrintf, HIGH, LOW, INPUT, OUTPUT,
          INPUT_PULLUP, INPUT_PULLDOWN, RISING, FALLING, CHANGE, WHITE, BLACK
        } = sandbox;
        var sprintf = sandbox.sprintf;
        var snprintf = sandbox.snprintf;
        var strlen = sandbox.strlen;
        var strcmp = sandbox.strcmp;
        var strcpy = sandbox.strcpy;
        var strcat = sandbox.strcat;
        var getHour = sandbox.getHour;
        var getMinute = sandbox.getMinute;
        var getSecond = sandbox.getSecond;

        var SSD1306_SWITCHCAPVCC = 0x02;

        // Default Hardware Pin Definitions (Fallbacks)
        var PIN_TFT_MOSI  = 23;
        var PIN_TFT_SCLK  = 18;
        var PIN_TFT_CS    = 5;
        var PIN_TFT_DC    = 16;
        var PIN_TFT_RST   = 17;
        var PIN_ROTARY_CLK = 19;
        var PIN_ROTARY_DT  = 21;
        var PIN_ROTARY_SW  = 22;
        var PIN_HOME_BTN   = 14;
        var PIN_CAST_BTN   = 27;
        var PIN_BACK_BTN   = 32;
        var PIN_CATCH_BTN  = 33;
        var PIN_ALERT_LED  = 13;

        // TFT 16-Bit RGB565 Color Constants
        var TFT_BLACK       = 0x0000;
        var TFT_NAVY        = 0x000F;
        var TFT_DARKGREEN   = 0x03E0;
        var TFT_DARKCYAN    = 0x03EF;
        var TFT_MAROON      = 0x7800;
        var TFT_PURPLE      = 0x780F;
        var TFT_OLIVE       = 0x7BE0;
        var TFT_LIGHTGREY   = 0xD69A;
        var TFT_DARKGREY    = 0x39E7;
        var TFT_BLUE        = 0x001F;
        var TFT_GREEN       = 0x07E0;
        var TFT_CYAN        = 0x07FF;
        var TFT_RED         = 0xF800;
        var TFT_MAGENTA     = 0xF81F;
        var TFT_YELLOW      = 0xFFE0;
        var TFT_WHITE       = 0xFFFF;
        var TFT_ORANGE      = 0xFD20;
        var TFT_GREENYELLOW = 0xAFE5;
        var TFT_PINK        = 0xFC18;

        var ST77XX_BLACK     = 0x0000;
        var ST77XX_WHITE     = 0xFFFF;
        var ST77XX_RED       = 0xF800;
        var ST77XX_GREEN     = 0x07E0;
        var ST77XX_BLUE      = 0x001F;
        var ST77XX_YELLOW    = 0xFFE0;
        var ST77XX_ORANGE    = 0xFD20;
        var ST77XX_CYAN      = 0x07FF;
        var ST77XX_MAGENTA   = 0xF81F;
        var ST77XX_LIGHTGREY = 0xD69A;
        var ST77XX_DARKGREY  = 0x39E7;
        var ST7735_BLACK     = 0x0000;
        var ST7735_WHITE     = 0xFFFF;
        var ST7735_RED       = 0xF800;
        var ST7735_GREEN     = 0x07E0;
        var ST7735_BLUE      = 0x001F;
        var ST7735_YELLOW    = 0xFFE0;
        var ST7735_ORANGE    = 0xFD20;
        var ST7735_CYAN      = 0x07FF;
        var ST7735_MAGENTA   = 0xF81F;
        var ST7735_LIGHTGREY = 0xD69A;
        var ST7735_DARKGREY  = 0x39E7;

        // C++ / Arduino Mock Helper Classes
        class Adafruit_SSD1306 {
          constructor(w, h, wire) { this.device = ssd1306; }
          begin(vcc, addr) { return true; }
          clearDisplay() { if (this.device?.clearDisplay) this.device.clearDisplay(); }
          display() { if (this.device?.display) this.device.display(); }
          setCursor(x, y) { if (this.device?.setCursor) this.device.setCursor(x, y); }
          setTextSize(s) { if (this.device?.setTextSize) this.device.setTextSize(s); }
          setTextColor(c) { if (this.device?.setTextColor) this.device.setTextColor(c); }
          print(val) { if (this.device?.print) this.device.print(val); }
          println(val) { if (this.device?.println) this.device.println(val); }
          drawPixel(x, y, c) { if (this.device?.drawPixel) this.device.drawPixel(x, y, c); }
          drawLine(x0, y0, x1, y1, c) { if (this.device?.drawLine) this.device.drawLine(x0, y0, x1, y1, c); }
          drawFastHLine(x, y, w, c) { if (this.device?.drawFastHLine) this.device.drawFastHLine(x, y, w, c); }
          drawFastVLine(x, y, h, c) { if (this.device?.drawFastVLine) this.device.drawFastVLine(x, y, h, c); }
          drawRect(x, y, w, h, c) { if (this.device?.drawRect) this.device.drawRect(x, y, w, h, c); }
          fillRect(x, y, w, h, c) { if (this.device?.fillRect) this.device.fillRect(x, y, w, h, c); }
          drawRoundRect(x, y, w, h, r, c) { if (this.device?.drawRoundRect) this.device.drawRoundRect(x, y, w, h, r, c); }
          fillRoundRect(x, y, w, h, r, c) { if (this.device?.fillRoundRect) this.device.fillRoundRect(x, y, w, h, r, c); }
          drawCircle(x, y, r, c) { if (this.device?.drawCircle) this.device.drawCircle(x, y, r, c); }
          fillCircle(x, y, r, c) { if (this.device?.fillCircle) this.device.fillCircle(x, y, r, c); }
        }

        class Adafruit_ST7789 {
          constructor(cs, dc, rst) { this.device = st7789; }
          init(w, h) { if (this.device?.init) this.device.init(w, h); }
          begin(w, h) { if (this.device?.begin) this.device.begin(w, h); }
          setRotation(r) { if (this.device?.setRotation) this.device.setRotation(r); }
          setSPISpeed(s) {}
          setTextWrap(w) { if (this.device?.setTextWrap) this.device.setTextWrap(w); }
          setFont(f) { if (this.device?.setFont) this.device.setFont(f); }
          invertDisplay(i) { if (this.device?.invertDisplay) this.device.invertDisplay(i); }
          enableDisplay(e) { if (this.device?.enableDisplay) this.device.enableDisplay(e); }
          width() { return this.device?.width || 320; }
          height() { return this.device?.height || 240; }
          getCursorX() { return this.device?.getCursorX() || 0; }
          getCursorY() { return this.device?.getCursorY() || 0; }
          fillScreen(c) { if (this.device?.fillScreen) this.device.fillScreen(c); }
          display() { if (this.device?.display) this.device.display(); }
          setCursor(x, y) { if (this.device?.setCursor) this.device.setCursor(x, y); }
          setTextSize(s) { if (this.device?.setTextSize) this.device.setTextSize(s); }
          setTextColor(c, bg) { if (this.device?.setTextColor) this.device.setTextColor(c, bg); }
          print(val, prec) { if (this.device?.print) this.device.print(val, prec); }
          println(val, prec) { if (this.device?.println) this.device.println(val, prec); }
          printf(fmt, ...args) { if (this.device?.printf) this.device.printf(fmt, ...args); }
          drawPixel(x, y, c) { if (this.device?.drawPixel) this.device.drawPixel(x, y, c); }
          drawLine(x0, y0, x1, y1, c) { if (this.device?.drawLine) this.device.drawLine(x0, y0, x1, y1, c); }
          drawFastHLine(x, y, w, c) { if (this.device?.drawFastHLine) this.device.drawFastHLine(x, y, w, c); }
          drawFastVLine(x, y, h, c) { if (this.device?.drawFastVLine) this.device.drawFastVLine(x, y, h, c); }
          drawRect(x, y, w, h, c) { if (this.device?.drawRect) this.device.drawRect(x, y, w, h, c); }
          fillRect(x, y, w, h, c) { if (this.device?.fillRect) this.device.fillRect(x, y, w, h, c); }
          drawRoundRect(x, y, w, h, r, c) { if (this.device?.drawRoundRect) this.device.drawRoundRect(x, y, w, h, r, c); }
          fillRoundRect(x, y, w, h, r, c) { if (this.device?.fillRoundRect) this.device.fillRoundRect(x, y, w, h, r, c); }
          drawCircle(x, y, r, c) { if (this.device?.drawCircle) this.device.drawCircle(x, y, r, c); }
          fillCircle(x, y, r, c) { if (this.device?.fillCircle) this.device.fillCircle(x, y, r, c); }
        }

        class Adafruit_ILI9341 extends Adafruit_ST7789 {}
        class TFT_eSPI extends Adafruit_ST7789 {}

        class Adafruit_BMP280 {
          constructor() { this.device = bmp280; }
          begin(addr) {
            var targetAddr = (typeof addr === 'number') ? addr : 0x76;
            if (typeof Wire !== 'undefined' && typeof Wire.getDevice === 'function') {
              return Wire.getDevice(targetAddr) !== undefined;
            }
            if (typeof i2cBus !== 'undefined' && typeof i2cBus.getDevice === 'function') {
              return i2cBus.getDevice(targetAddr) !== undefined;
            }
            return true;
          }
          readTemperature() { return this.device.readTemperature(); }
          readPressure() { return this.device.readPressure(); }
          readAltitude(p0) { return this.device.readAltitude(p0); }
        }

        class Adafruit_BME280 extends Adafruit_BMP280 {
          readHumidity() { return 50.0; }
        }

        // BLE GATT Mock Architecture
        class BLE2902 {}

        class BLECharacteristic {
          static PROPERTY_READ = 0x02;
          static PROPERTY_WRITE = 0x08;
          static PROPERTY_NOTIFY = 0x10;
          constructor(uuid, props) {
            this.uuid = uuid;
            this.props = props;
          }
          addDescriptor(d) {}
          setValue(v) {}
          notify() {}
        }

        class BLEService {
          constructor(uuid) {
            this.uuid = uuid;
            this.characteristics = [];
          }
          createCharacteristic(uuid, props) {
            const char = new BLECharacteristic(uuid, props);
            this.characteristics.push(char);
            return char;
          }
          start() {}
        }

        class BLEAdvertising {
          addServiceUUID(uuid) {}
          setScanResponse(b) {}
          start() {}
        }

        class BLEServer {
          createService(uuid) {
            return new BLEService(uuid);
          }
        }

        const BLEDevice = {
          init: (name) => {},
          createServer: () => new BLEServer(),
          getAdvertising: () => new BLEAdvertising()
        };

        ${jsCode}

        return {
          setup: typeof setup === 'function' ? setup : null,
          loop: typeof loop === 'function' ? loop : null
        };
      `;

      const sketchExports = new Function('sandbox', scriptBody)(sandbox);
      this.userSetup = sketchExports.setup;
      this.userLoop = sketchExports.loop;

      // Run setup()
      if (this.userSetup) {
        logger.info('VM', 'Executing setup()...');
        await this.userSetup();
        st7789.notify();
        ssd1306.display();
      }

      // Start continuous loop()
      this.scheduleNextLoop();
    } catch (err: any) {
      logger.error('VM', `Execution Error: ${err.message || err}`, err);
      this.emitSerial(`[RUNTIME ERROR]: ${err.message || err}`, 'ERROR');
      this.notifyState('ERROR');
      this.isRunning = false;
    }
  }

  private scheduleNextLoop() {
    if (!this.isRunning || this.isPaused) return;

    this.loopTimerId = setTimeout(async () => {
      if (!this.isRunning || this.isPaused) return;

      try {
        if (this.userLoop) {
          await this.userLoop();
        }
        st7789.notify();
        this.scheduleNextLoop();
      } catch (err: any) {
        logger.error('VM', `Loop Error: ${err.message || err}`, err);
        this.emitSerial(`[LOOP ERROR]: ${err.message || err}`, 'ERROR');
        this.notifyState('ERROR');
        this.isRunning = false;
      }
    }, Math.max(16, Math.round(25 / this.speedMultiplier)));
  }

  public pause() {
    this.isPaused = true;
    if (this.loopTimerId) clearTimeout(this.loopTimerId);
    this.notifyState('PAUSED');
  }

  public resume() {
    if (this.state === 'PAUSED') {
      this.isPaused = false;
      this.notifyState('RUNNING');
      this.scheduleNextLoop();
    }
  }

  public async step() {
    if (this.state === 'PAUSED' && this.userLoop) {
      try {
        await this.userLoop();
      } catch (err: any) {
        this.emitSerial(`[STEP ERROR]: ${err.message || err}`, 'ERROR');
      }
    }
  }

  public stop() {
    this.isRunning = false;
    this.isPaused = false;
    if (this.loopTimerId) clearTimeout(this.loopTimerId);
    this.notifyState('STOPPED');
  }

  public reset() {
    this.stop();
    gpioManager.resetAllPins();
    ssd1306.clearDisplay();
    ssd1306.display();
    rotaryEncoder.reset();
  }
}

export const esp32Engine = new ESP32Engine();
