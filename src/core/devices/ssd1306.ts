import { II2CDevice } from '../../types/esp32';
import { i2cBus } from '../i2cBus';
import { logger } from '../../utils/logger';

export type FrameBufferUpdateListener = (buffer: Uint8Array) => void;

// Basic 5x7 ASCII Bitmap Font Matrix
const FONT_5X7: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x00, 0x00, 0x5F, 0x00, 0x00],
  '"': [0x00, 0x07, 0x00, 0x07, 0x00],
  '#': [0x14, 0x7F, 0x14, 0x7F, 0x14],
  '$': [0x24, 0x2A, 0x7F, 0x2A, 0x12],
  '%': [0x23, 0x13, 0x08, 0x64, 0x62],
  '&': [0x36, 0x49, 0x55, 0x22, 0x50],
  "'": [0x00, 0x05, 0x03, 0x00, 0x00],
  '(': [0x00, 0x1C, 0x22, 0x41, 0x00],
  ')': [0x00, 0x41, 0x22, 0x1C, 0x00],
  '*': [0x14, 0x08, 0x3E, 0x08, 0x14],
  '+': [0x08, 0x08, 0x3E, 0x08, 0x08],
  ',': [0x00, 0x50, 0x30, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '0': [0x3E, 0x51, 0x49, 0x45, 0x3E],
  '1': [0x00, 0x42, 0x7F, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4B, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7F, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3C, 0x4A, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1E],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  ';': [0x00, 0x56, 0x36, 0x00, 0x00],
  '<': [0x08, 0x14, 0x22, 0x41, 0x00],
  '=': [0x14, 0x14, 0x14, 0x14, 0x14],
  '>': [0x00, 0x41, 0x22, 0x14, 0x08],
  '?': [0x02, 0x01, 0x51, 0x09, 0x06],
  '@': [0x32, 0x49, 0x79, 0x41, 0x3E],
  'A': [0x7E, 0x11, 0x11, 0x11, 0x7E],
  'B': [0x7F, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3E, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7F, 0x41, 0x41, 0x22, 0x1C],
  'E': [0x7F, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7F, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3E, 0x41, 0x49, 0x49, 0x7A],
  'H': [0x7F, 0x08, 0x08, 0x08, 0x7F],
  'I': [0x00, 0x41, 0x7F, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3F, 0x01],
  'K': [0x7F, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7F, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7F, 0x02, 0x0C, 0x02, 0x7F],
  'N': [0x7F, 0x04, 0x08, 0x10, 0x7F],
  'O': [0x3E, 0x41, 0x41, 0x41, 0x3E],
  'P': [0x7F, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3E, 0x41, 0x51, 0x21, 0x5E],
  'R': [0x7F, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7F, 0x01, 0x01],
  'U': [0x3F, 0x40, 0x40, 0x40, 0x3F],
  'V': [0x1F, 0x20, 0x40, 0x20, 0x1F],
  'W': [0x7F, 0x20, 0x18, 0x20, 0x7F],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43]
};

export class SSD1306Device implements II2CDevice {
  public address: number;
  public name: string = 'SSD1306 OLED (128x64)';
  public width: number = 128;
  public height: number = 64;

  private frameBuffer: Uint8Array = new Uint8Array(1024);
  private listeners: Set<FrameBufferUpdateListener> = new Set();

  private cursorX: number = 0;
  private cursorY: number = 0;
  private textSize: number = 1;
  private textColor: number = 1;

  constructor(address: number = 0x3C, width: number = 128, height: number = 64) {
    this.address = address;
    this.width = width;
    this.height = height;
    this.clearDisplay();
    i2cBus.registerDevice(this);
    logger.info('OLED', `SSD1306 Kijelző inicializálva [${width}x${height}, I2C: 0x${address.toString(16).toUpperCase()}]`);
  }

  public onFrameUpdate(listener: FrameBufferUpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.frameBuffer);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const copy = new Uint8Array(this.frameBuffer);
    this.listeners.forEach(l => l(copy));
  }

  public getFrameBuffer(): Uint8Array {
    return this.frameBuffer;
  }

  public readRegister(_reg: number): number {
    return 0;
  }

  public writeRegister(_reg: number, _data: number): void {
  }

  public receiveBytes(bytes: Uint8Array): void {
    if (bytes.length < 2) return;
    const controlByte = bytes[0];

    if (controlByte === 0x40) {
      this.notify();
    }
  }

  public readBytes(count: number): Uint8Array {
    return new Uint8Array(count);
  }

  // --- GFX Drawing Commands ---

  public clearDisplay() {
    this.frameBuffer.fill(0);
    this.cursorX = 0;
    this.cursorY = 0;
  }

  public display() {
    logger.trace('OLED', 'display() -> Framebuffer szinkronizálva a vászonnal');
    this.notify();
  }

  public setCursor(x: number, y: number) {
    this.cursorX = x;
    this.cursorY = y;
  }

  public setTextSize(size: number) {
    this.textSize = Math.max(1, size);
  }

  public setTextColor(color: number) {
    this.textColor = color;
  }

  public drawPixel(x: number, y: number, color: number = 1) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const page = Math.floor(y / 8);
    const bit = y % 8;
    const idx = page * this.width + x;

    if (color !== 0) {
      this.frameBuffer[idx] |= (1 << bit);
    } else {
      this.frameBuffer[idx] &= ~(1 << bit);
    }
  }

  public drawLine(x0: number, y0: number, x1: number, y1: number, color: number = 1) {
    let dx = Math.abs(x1 - x0);
    let sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0);
    let sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;

    while (true) {
      this.drawPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      let e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  public drawRect(x: number, y: number, w: number, h: number, color: number = 1) {
    this.drawLine(x, y, x + w - 1, y, color);
    this.drawLine(x, y + h - 1, x + w - 1, y + h - 1, color);
    this.drawLine(x, y, x, y + h - 1, color);
    this.drawLine(x + w - 1, y, x + w - 1, y + h - 1, color);
  }

  public fillRect(x: number, y: number, w: number, h: number, color: number = 1) {
    for (let i = x; i < x + w; i++) {
      this.drawLine(i, y, i, y + h - 1, color);
    }
  }

  public drawCircle(x0: number, y0: number, r: number, color: number = 1) {
    let f = 1 - r;
    let ddF_x = 1;
    let ddF_y = -2 * r;
    let x = 0;
    let y = r;

    this.drawPixel(x0, y0 + r, color);
    this.drawPixel(x0, y0 - r, color);
    this.drawPixel(x0 + r, y0, color);
    this.drawPixel(x0 - r, y0, color);

    while (x < y) {
      if (f >= 0) {
        y--;
        ddF_y += 2;
        f += ddF_y;
      }
      x++;
      ddF_x += 2;
      f += ddF_x;

      this.drawPixel(x0 + x, y0 + y, color);
      this.drawPixel(x0 - x, y0 + y, color);
      this.drawPixel(x0 + x, y0 - y, color);
      this.drawPixel(x0 - x, y0 - y, color);
      this.drawPixel(x0 + y, y0 + x, color);
      this.drawPixel(x0 - y, y0 + x, color);
      this.drawPixel(x0 + y, y0 - x, color);
      this.drawPixel(x0 - y, y0 - x, color);
    }
  }

  public fillCircle(x0: number, y0: number, r: number, color: number = 1) {
    this.drawLine(x0, y0 - r, x0, y0 + r, color);
    let f = 1 - r;
    let ddF_x = 1;
    let ddF_y = -2 * r;
    let x = 0;
    let y = r;

    while (x < y) {
      if (f >= 0) {
        y--;
        ddF_y += 2;
        f += ddF_y;
      }
      x++;
      ddF_x += 2;
      f += ddF_x;

      this.drawLine(x0 + x, y0 - y, x0 + x, y0 + y, color);
      this.drawLine(x0 - x, y0 - y, x0 - x, y0 + y, color);
      this.drawLine(x0 + x, y0 - x, x0 + x, y0 + x, color);
      this.drawLine(x0 - x, y0 - x, x0 - x, y0 + x, color);
    }
  }

  public printChar(c: string) {
    const uppercase = c.toUpperCase();
    const bitmap = FONT_5X7[uppercase] || FONT_5X7['?'];

    for (let col = 0; col < 5; col++) {
      const line = bitmap[col];
      for (let row = 0; row < 7; row++) {
        if ((line & (1 << row)) !== 0) {
          if (this.textSize === 1) {
            this.drawPixel(this.cursorX + col, this.cursorY + row, this.textColor);
          } else {
            this.fillRect(
              this.cursorX + col * this.textSize,
              this.cursorY + row * this.textSize,
              this.textSize,
              this.textSize,
              this.textColor
            );
          }
        }
      }
    }

    this.cursorX += 6 * this.textSize;
    if (this.cursorX > this.width - 6 * this.textSize) {
      this.cursorX = 0;
      this.cursorY += 8 * this.textSize;
    }
  }

  public print(text: any) {
    const str = String(text);
    for (let i = 0; i < str.length; i++) {
      if (str[i] === '\n') {
        this.cursorX = 0;
        this.cursorY += 8 * this.textSize;
      } else {
        this.printChar(str[i]);
      }
    }
  }

  public println(text: any = '') {
    this.print(text);
    this.cursorX = 0;
    this.cursorY += 8 * this.textSize;
  }

  public printf(format: string, ...args: any[]) {
    let formatted = format;
    for (const arg of args) {
      formatted = formatted.replace(/%(\.?\d*)?[dfsc]/, String(arg));
    }
    this.print(formatted);
  }
}

export const ssd1306 = new SSD1306Device(0x3C, 128, 64);
