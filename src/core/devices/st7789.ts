import { logger } from '../../utils/logger';

export type ColorFrameBufferUpdateListener = (buffer: Uint8ClampedArray) => void;

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
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '[': [0x00, 0x7F, 0x41, 0x41, 0x00],
  ']': [0x00, 0x41, 0x41, 0x7F, 0x00],
  '^': [0x04, 0x02, 0x01, 0x02, 0x04],
  '_': [0x40, 0x40, 0x40, 0x40, 0x40],
  '|': [0x00, 0x00, 0x7F, 0x00, 0x00],
  '~': [0x08, 0x04, 0x08, 0x10, 0x08],
  '\\': [0x02, 0x04, 0x08, 0x10, 0x20]
};

export function parseColor(c: any): [number, number, number, number] {
  if (typeof c === 'number') {
    // 16-bit RGB565 format
    if (c <= 0xFFFF) {
      const r = Math.round(((c >> 11) & 0x1F) * (255 / 31));
      const g = Math.round(((c >> 5) & 0x3F) * (255 / 63));
      const b = Math.round((c & 0x1F) * (255 / 31));
      return [r, g, b, 255];
    }
    // 24-bit 0xRRGGBB
    const r = (c >> 16) & 0xFF;
    const g = (c >> 8) & 0xFF;
    const b = c & 0xFF;
    return [r, g, b, 255];
  }
  if (typeof c === 'string') {
    if (c.startsWith('#')) {
      const hex = c.replace('#', '');
      if (hex.length === 6) {
        return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), 255];
      }
    }
    if (c === 'WHITE') return [255, 255, 255, 255];
    if (c === 'BLACK') return [0, 0, 0, 255];
    if (c === 'RED') return [255, 0, 0, 255];
    if (c === 'GREEN') return [0, 255, 0, 255];
    if (c === 'BLUE') return [0, 0, 255, 255];
    if (c === 'YELLOW') return [255, 255, 0, 255];
    if (c === 'CYAN') return [0, 255, 255, 255];
    if (c === 'ORANGE') return [255, 165, 0, 255];
  }
  return [255, 255, 255, 255];
}

export class ST7789Device {
  public name: string = 'ST7789 IPS Színes Kijelző (320x240)';
  public width: number = 320;
  public height: number = 240;

  // RGBA 320x240x4 = 307200 bytes
  private frameBuffer: Uint8ClampedArray;
  private listeners: Set<ColorFrameBufferUpdateListener> = new Set();

  private cursorX: number = 0;
  private cursorY: number = 0;
  private textSize: number = 2;
  private textColor: [number, number, number, number] = [255, 255, 255, 255];
  private textBgColor: [number, number, number, number] | null = null;

  private dirty: boolean = false;
  private notifyScheduled: boolean = false;

  constructor(width: number = 320, height: number = 240) {
    this.width = width;
    this.height = height;
    this.frameBuffer = new Uint8ClampedArray(this.width * this.height * 4);
    this.clearDisplay();
    logger.info('DISPLAY', `ST7789 Színes Kijelző inicializálva [${width}x${height} RGB]`);
  }

  public onFrameUpdate(listener: ColorFrameBufferUpdateListener): () => void {
    this.listeners.add(listener);
    listener(new Uint8ClampedArray(this.frameBuffer));
    return () => this.listeners.delete(listener);
  }

  public scheduleNotify() {
    this.dirty = true;
    if (!this.notifyScheduled) {
      this.notifyScheduled = true;
      setTimeout(() => {
        this.notifyScheduled = false;
        if (this.dirty) {
          this.dirty = false;
          this.notify();
        }
      }, 0);
    }
  }

  public notify() {
    const copy = new Uint8ClampedArray(this.frameBuffer);
    this.listeners.forEach(fn => fn(copy));
  }

  public init(width?: number, height?: number) {
    if (width && height && (this.width !== width || this.height !== height)) {
      this.width = width;
      this.height = height;
      this.frameBuffer = new Uint8ClampedArray(this.width * this.height * 4);
    }
    this.clearDisplay();
    this.notify();
    logger.info('DISPLAY', `ST7789.init(${this.width}x${this.height}) sikeres`);
  }

  public begin(width?: number, height?: number) {
    this.init(width, height);
  }

  public setRotation(rotation: number) {
    logger.debug('DISPLAY', `ST7789.setRotation(${rotation})`);
  }

  public invertDisplay(invert: boolean) {
    logger.debug('DISPLAY', `ST7789.invertDisplay(${invert})`);
  }

  public enableDisplay(enable: boolean) {
    logger.debug('DISPLAY', `ST7789.enableDisplay(${enable})`);
  }

  public setTextWrap(_wrap: boolean) {
    // text wrap configuration
  }

  public getCursorX(): number {
    return this.cursorX;
  }

  public getCursorY(): number {
    return this.cursorY;
  }

  public clearDisplay() {
    this.fillScreen(0x0000);
    this.scheduleNotify();
  }

  public fillScreen(color: any) {
    const [r, g, b, a] = parseColor(color);
    for (let i = 0; i < this.frameBuffer.length; i += 4) {
      this.frameBuffer[i] = r;
      this.frameBuffer[i + 1] = g;
      this.frameBuffer[i + 2] = b;
      this.frameBuffer[i + 3] = a;
    }
    this.scheduleNotify();
  }

  public drawPixel(x: number, y: number, color: any) {
    x = Math.floor(x);
    y = Math.floor(y);
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;

    const [r, g, b, a] = parseColor(color);
    const idx = (y * this.width + x) * 4;
    this.frameBuffer[idx] = r;
    this.frameBuffer[idx + 1] = g;
    this.frameBuffer[idx + 2] = b;
    this.frameBuffer[idx + 3] = a;
    this.scheduleNotify();
  }

  public drawFastHLine(x: number, y: number, w: number, color: any) {
    x = Math.floor(x);
    y = Math.floor(y);
    w = Math.floor(w);
    if (y < 0 || y >= this.height || w <= 0) return;
    const startX = Math.max(0, x);
    const endX = Math.min(this.width, x + w);
    const [r, g, b, a] = parseColor(color);

    for (let curX = startX; curX < endX; curX++) {
      const idx = (y * this.width + curX) * 4;
      this.frameBuffer[idx] = r;
      this.frameBuffer[idx + 1] = g;
      this.frameBuffer[idx + 2] = b;
      this.frameBuffer[idx + 3] = a;
    }
  }

  public drawFastVLine(x: number, y: number, h: number, color: any) {
    x = Math.floor(x);
    y = Math.floor(y);
    h = Math.floor(h);
    if (x < 0 || x >= this.width || h <= 0) return;
    const startY = Math.max(0, y);
    const endY = Math.min(this.height, y + h);
    const [r, g, b, a] = parseColor(color);

    for (let curY = startY; curY < endY; curY++) {
      const idx = (curY * this.width + x) * 4;
      this.frameBuffer[idx] = r;
      this.frameBuffer[idx + 1] = g;
      this.frameBuffer[idx + 2] = b;
      this.frameBuffer[idx + 3] = a;
    }
  }

  public drawLine(x0: number, y0: number, x1: number, y1: number, color: any) {
    x0 = Math.floor(x0); y0 = Math.floor(y0);
    x1 = Math.floor(x1); y1 = Math.floor(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      this.drawPixel(x0, y0, color);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }

  public drawRect(x: number, y: number, w: number, h: number, color: any) {
    this.drawFastHLine(x, y, w, color);
    this.drawFastHLine(x, y + h - 1, w, color);
    this.drawFastVLine(x, y, h, color);
    this.drawFastVLine(x + w - 1, y, h, color);
  }

  public fillRect(x: number, y: number, w: number, h: number, color: any) {
    for (let curY = y; curY < y + h; curY++) {
      this.drawFastHLine(x, curY, w, color);
    }
  }

  public drawRoundRect(x: number, y: number, w: number, h: number, r: number, color: any) {
    this.drawFastHLine(x + r, y, w - 2 * r, color);
    this.drawFastHLine(x + r, y + h - 1, w - 2 * r, color);
    this.drawFastVLine(x, y + r, h - 2 * r, color);
    this.drawFastVLine(x + w - 1, y + r, h - 2 * r, color);
    this.drawCircleHelper(x + r, y + r, r, 1, color);
    this.drawCircleHelper(x + w - r - 1, y + r, r, 2, color);
    this.drawCircleHelper(x + w - r - 1, y + h - r - 1, r, 4, color);
    this.drawCircleHelper(x + r, y + h - r - 1, r, 8, color);
  }

  public fillRoundRect(x: number, y: number, w: number, h: number, r: number, color: any) {
    this.fillRect(x + r, y, w - 2 * r, h, color);
    this.fillCircleHelper(x + w - r - 1, y + r, r, 1, h - 2 * r - 1, color);
    this.fillCircleHelper(x + r, y + r, r, 2, h - 2 * r - 1, color);
  }

  public drawCircle(x0: number, y0: number, r: number, color: any) {
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

  public fillCircle(x0: number, y0: number, r: number, color: any) {
    this.drawFastVLine(x0, y0 - r, 2 * r + 1, color);
    this.fillCircleHelper(x0, y0, r, 3, 0, color);
  }

  private drawCircleHelper(x0: number, y0: number, r: number, cornername: number, color: any) {
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
      if (cornername & 0x4) {
        this.drawPixel(x0 + x, y0 + y, color);
        this.drawPixel(x0 + y, y0 + x, color);
      }
      if (cornername & 0x2) {
        this.drawPixel(x0 + x, y0 - y, color);
        this.drawPixel(x0 + y, y0 - x, color);
      }
      if (cornername & 0x8) {
        this.drawPixel(x0 - y, y0 + x, color);
        this.drawPixel(x0 - x, y0 + y, color);
      }
      if (cornername & 0x1) {
        this.drawPixel(x0 - y, y0 - x, color);
        this.drawPixel(x0 - x, y0 - y, color);
      }
    }
  }

  private fillCircleHelper(x0: number, y0: number, r: number, cornername: number, delta: number, color: any) {
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

      if (cornername & 0x1) {
        this.drawFastVLine(x0 + x, y0 - y, 2 * y + 1 + delta, color);
        this.drawFastVLine(x0 + y, y0 - x, 2 * x + 1 + delta, color);
      }
      if (cornername & 0x2) {
        this.drawFastVLine(x0 - x, y0 - y, 2 * y + 1 + delta, color);
        this.drawFastVLine(x0 - y, y0 - x, 2 * x + 1 + delta, color);
      }
    }
  }

  // --- Text Rendering ---

  public setCursor(x: number, y: number) {
    this.cursorX = Math.floor(x);
    this.cursorY = Math.floor(y);
  }

  public setTextSize(size: number) {
    this.textSize = Math.max(1, Math.floor(size));
  }

  public setFont(_font?: any) {
    // Compatible with Adafruit GFX FreeFonts in simulation
  }

  public setTextColor(fg: any, bg?: any) {
    this.textColor = parseColor(fg);
    this.textBgColor = bg !== undefined ? parseColor(bg) : null;
  }

  public drawChar(x: number, y: number, c: string, color: any, bg: any, size: number) {
    const glyph = FONT_5X7[c.toUpperCase()] || FONT_5X7[' '];
    for (let i = 0; i < 5; i++) {
      let line = glyph[i];
      for (let j = 0; j < 8; j++) {
        if (line & 0x1) {
          if (size === 1) {
            this.drawPixel(x + i, y + j, color);
          } else {
            this.fillRect(x + i * size, y + j * size, size, size, color);
          }
        } else if (bg) {
          if (size === 1) {
            this.drawPixel(x + i, y + j, bg);
          } else {
            this.fillRect(x + i * size, y + j * size, size, size, bg);
          }
        }
        line >>= 1;
      }
    }
  }

  public write(c: string) {
    if (c === '\n') {
      this.cursorY += this.textSize * 8;
      this.cursorX = 0;
      return;
    }
    if (c === '\r') return;

    this.drawChar(this.cursorX, this.cursorY, c, this.textColor, this.textBgColor, this.textSize);
    this.cursorX += this.textSize * 6;
  }

  public print(text: any) {
    const s = String(text);
    for (let i = 0; i < s.length; i++) {
      this.write(s[i]);
    }
  }

  public println(text: any = '') {
    this.print(text);
    this.write('\n');
  }

  public printf(format: string, ...args: any[]) {
    let i = 0;
    const formatted = format.replace(/%[sdf.0-9]*/g, () => {
      const val = args[i++];
      return val !== undefined ? String(val) : '';
    });
    this.print(formatted);
  }

  public display() {
    this.notify();
  }
}

export const st7789 = new ST7789Device(320, 240);
