import { ESPLoader, Transport } from 'esptool-js';
import { logger } from '../utils/logger';

export type SerialConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'FLASHING' | 'ERROR';

export interface USBDeviceInfo {
  vendorId?: number;
  productId?: number;
  chipName?: string;
}

export interface HardwareSerialListener {
  onStateChange?: (state: SerialConnectionState, info?: string) => void;
  onData?: (data: string) => void;
  onLog?: (log: string) => void;
  onProgress?: (fileIndex: number, written: number, total: number) => void;
  onDeviceChange?: (isAttached: boolean, device?: USBDeviceInfo) => void;
}

export class HardwareSerialService {
  private port: any | null = null;
  private reader: any | null = null;
  private transport: any | null = null;
  private espLoader: any | null = null;
  private state: SerialConnectionState = 'DISCONNECTED';
  private listeners: Set<HardwareSerialListener> = new Set();
  private baudRate: number = 115200;
  private isReading: boolean = false;
  private attachedDevice: USBDeviceInfo | null = null;

  constructor() {
    this.initDeviceListeners();
  }

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public getAttachedDevice(): USBDeviceInfo | null {
    return this.attachedDevice;
  }

  public identifyChip(vendorId?: number, productId?: number): string {
    if (!vendorId) return 'Ismeretlen USB Soros eszköz';
    const v = vendorId.toString(16).toUpperCase().padStart(4, '0');
    const p = productId ? productId.toString(16).toUpperCase().padStart(4, '0') : '';

    if (vendorId === 0x10c4) return `Silicon Labs CP2102/CP2104 (VID:${v})`;
    if (vendorId === 0x1a86) return `WCH CH340 / CH9102 ESP32 (VID:${v})`;
    if (vendorId === 0x0403) return `FTDI USB Serial (VID:${v})`;
    if (vendorId === 0x303a) return `Espressif Native USB CDC (VID:${v} PID:${p})`;
    return `USB Serial Adapter (VID:${v} PID:${p})`;
  }

  private async initDeviceListeners() {
    if (!this.isSupported()) return;

    try {
      const serial = (navigator as any).serial;
      
      // Check existing paired ports
      const ports = await serial.getPorts();
      if (ports.length > 0) {
        const info = ports[0].getInfo ? ports[0].getInfo() : {};
        const chipName = this.identifyChip(info.usbVendorId, info.usbProductId);
        this.attachedDevice = {
          vendorId: info.usbVendorId,
          productId: info.usbProductId,
          chipName
        };
        this.notifyDeviceChange(true, this.attachedDevice);
      }

      // Listen to USB plug-in events
      serial.addEventListener('connect', (e: any) => {
        const info = e.port?.getInfo ? e.port.getInfo() : {};
        const chipName = this.identifyChip(info.usbVendorId, info.usbProductId);
        this.attachedDevice = {
          vendorId: info.usbVendorId,
          productId: info.usbProductId,
          chipName
        };
        this.notifyLog(`[USB HARDVER] 🔌 Új eszköz csatlakoztatva: ${chipName}`);
        this.notifyDeviceChange(true, this.attachedDevice);
      });

      // Listen to USB unplug events
      serial.addEventListener('disconnect', (_e: any) => {
        const prev = this.attachedDevice;
        this.attachedDevice = null;
        this.notifyLog(`[USB HARDVER] ❌ Eszköz leválasztva: ${prev?.chipName || 'ESP32'}`);
        if (this.state === 'CONNECTED' || this.state === 'FLASHING') {
          this.disconnect();
        }
        this.notifyDeviceChange(false);
      });
    } catch {
      // Ignored
    }
  }

  private notifyDeviceChange(isAttached: boolean, device?: USBDeviceInfo) {
    this.listeners.forEach(l => l.onDeviceChange?.(isAttached, device));
  }

  public getState(): SerialConnectionState {
    return this.state;
  }

  public getBaudRate(): number {
    return this.baudRate;
  }

  public setBaudRate(rate: number) {
    this.baudRate = rate;
  }

  public subscribe(listener: HardwareSerialListener): () => void {
    this.listeners.add(listener);
    listener.onStateChange?.(this.state);
    return () => this.listeners.delete(listener);
  }

  private notifyState(state: SerialConnectionState, info?: string) {
    this.state = state;
    this.listeners.forEach(l => l.onStateChange?.(state, info));
  }

  private notifyData(data: string) {
    this.listeners.forEach(l => l.onData?.(data));
  }

  private notifyLog(log: string) {
    logger.info('HARDWARE_SERIAL', log);
    this.listeners.forEach(l => l.onLog?.(log));
  }

  /**
   * Request user to pick a serial port and connect to it for live bidirectional Serial Monitor.
   */
  public async connect(baud: number = this.baudRate): Promise<boolean> {
    if (!this.isSupported()) {
      this.notifyState('ERROR', 'Web Serial API is not supported in this environment.');
      return false;
    }

    try {
      this.notifyState('CONNECTING', 'Várakozás a port kiválasztására...');
      const serial = (navigator as any).serial;
      this.port = await serial.requestPort({
        filters: [
          { usbVendorId: 0x10c4 }, // Silicon Labs CP210x
          { usbVendorId: 0x1a86 }, // QinHeng CH340 / CH9102
          { usbVendorId: 0x0403 }, // FTDI
          { usbVendorId: 0x303a }  // Espressif USB
        ]
      });

      this.baudRate = baud;
      await this.port.open({ baudRate: this.baudRate });

      this.notifyState('CONNECTED', `Csatlakoztatva: ${this.baudRate} baud`);
      this.notifyLog(`[HARDWARE USB] Sikeres kapcsolat nyitva (${this.baudRate} baud)`);

      this.startReading();
      return true;
    } catch (err: any) {
      if (err.name === 'NotFoundError') {
        this.notifyState('DISCONNECTED', 'Nem lett port kiválasztva.');
      } else {
        this.notifyState('ERROR', err.message || 'Kapcsolódási hiba.');
        this.notifyLog(`[HARDWARE USB HIBA]: ${err.message}`);
      }
      return false;
    }
  }

  /**
   * Start reading incoming serial text from the physical ESP32.
   */
  private async startReading() {
    if (!this.port || !this.port.readable || this.isReading) return;

    this.isReading = true;
    const textDecoder = new TextDecoderStream();
    this.port.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.isReading && this.port) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          this.notifyData(value);
        }
      }
    } catch (err: any) {
      if (this.state === 'CONNECTED') {
        this.notifyLog(`[HARDWARE USB Olvasási hiba]: ${err.message}`);
      }
    } finally {
      try {
        this.reader?.releaseLock();
      } catch {}
      this.isReading = false;
    }
  }

  /**
   * Send text / command to the physical ESP32.
   */
  public async write(data: string): Promise<boolean> {
    if (!this.port || !this.port.writable || this.state !== 'CONNECTED') return false;

    try {
      const encoder = new TextEncoder();
      const writer = this.port.writable.getWriter();
      await writer.write(encoder.encode(data));
      writer.releaseLock();
      return true;
    } catch (err: any) {
      this.notifyLog(`[HARDWARE USB Küldési hiba]: ${err.message}`);
      return false;
    }
  }

  /**
   * Hardware Reset physical ESP32 using RTS / DTR lines.
   */
  public async hardReset(): Promise<boolean> {
    if (!this.port) return false;
    try {
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: true });
      await new Promise(r => setTimeout(r, 100));
      await this.port.setSignals({ dataTerminalReady: true, requestToSend: false });
      await new Promise(r => setTimeout(r, 50));
      await this.port.setSignals({ dataTerminalReady: false, requestToSend: false });
      this.notifyLog('[HARDWARE USB] ESP32 Hard Reset jel elküldve');
      return true;
    } catch (err: any) {
      this.notifyLog(`[HARDWARE USB Reset hiba]: ${err.message}`);
      return false;
    }
  }

  /**
   * Flash firmware binary to the physical ESP32 using esptool-js.
   */
  public async flashBinary(
    fileArray: Array<{ data: string | Uint8Array; address: number }>,
    flashBaud: number = 460800
  ): Promise<boolean> {
    if (!this.isSupported()) {
      this.notifyState('ERROR', 'Web Serial nem támogatott.');
      return false;
    }

    try {
      // If already open in serial monitor mode, stop reader and close port so Transport can open it
      if (this.reader) {
        this.isReading = false;
        try {
          await this.reader.cancel();
          this.reader.releaseLock();
          this.reader = null;
        } catch {}
      }

      if (this.port) {
        try {
          await this.port.close();
        } catch {}
      } else {
        const serial = (navigator as any).serial;
        this.port = await serial.requestPort({
          filters: [
            { usbVendorId: 0x10c4 }, // CP210x
            { usbVendorId: 0x1a86 }, // CH340
            { usbVendorId: 0x0403 }, // FTDI
            { usbVendorId: 0x303a }  // Espressif
          ]
        });
      }

      this.notifyState('FLASHING', 'Kapcsolódás a bootloaderhez...');
      this.notifyLog('[FLASH] ROM Bootloader szinkronizáció indítása...');

      this.transport = new Transport(this.port);
      this.espLoader = new ESPLoader({
        transport: this.transport,
        baudrate: flashBaud,
        terminal: {
          clean: () => {},
          writeLine: (s: string) => this.notifyLog(s),
          write: (s: string) => this.notifyLog(s)
        }
      });

      const chip = await this.espLoader.main();
      this.notifyLog(`[FLASH] Célcsip felismerve: ${chip}`);

      const flashOptions = {
        fileArray: fileArray.map(f => ({
          data: typeof f.data === 'string' ? f.data : new TextDecoder('latin1').decode(f.data),
          address: f.address
        })),
        flashMode: 'dio' as any,
        flashFreq: '40m' as any,
        flashSize: '4MB' as any,
        eraseAll: false,
        compress: false,
        reportProgress: (_fileIndex: number, written: number, total: number) => {
          this.listeners.forEach(l => l.onProgress?.(_fileIndex, written, total));
        }
      };

      this.notifyLog('[FLASH] Firmware írása a flash memóriába...');
      await this.espLoader.writeFlash(flashOptions);

      this.notifyLog('[FLASH] Firmware égetés sikeres! Újraindítás...');
      try {
        if (typeof this.espLoader.after === 'function') {
          await this.espLoader.after('hard_reset');
        }
      } catch {}

      try {
        await this.transport.disconnect();
      } catch {}

      // Reopen for Serial Monitor
      try {
        await this.port.open({ baudRate: this.baudRate });
        await this.hardReset();
        this.notifyState('CONNECTED', 'Feltöltés kész, ESP32 fut!');
        this.startReading();
      } catch {
        this.notifyState('CONNECTED', 'Feltöltés sikeres!');
      }

      return true;
    } catch (err: any) {
      this.notifyState('ERROR', `Égetési hiba: ${err.message}`);
      this.notifyLog(`[FLASH HIBA]: ${err.message}`);
      return false;
    }
  }

  /**
   * Disconnect from serial port.
   */
  public async disconnect() {
    this.isReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch {}

    this.notifyState('DISCONNECTED', 'Leválasztva.');
    this.notifyLog('[HARDWARE USB] Kapcsolat bontva');
  }
}

export const hardwareSerial = new HardwareSerialService();
