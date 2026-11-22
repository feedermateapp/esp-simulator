import { II2CDevice } from '../types/esp32';
import { logger } from '../utils/logger';

export class I2CBus {
  private devices: Map<number, II2CDevice> = new Map();
  private txBuffer: number[] = [];
  private txAddress: number = 0;
  private rxBuffer: number[] = [];
  private rxIndex: number = 0;

  public registerDevice(device: II2CDevice) {
    this.devices.set(device.address, device);
    logger.info('I2C', `Periféria regisztrálva a buszon: ${device.name} [0x${device.address.toString(16).toUpperCase()}]`);
  }

  public unregisterDevice(address: number) {
    const dev = this.devices.get(address);
    this.devices.delete(address);
    if (dev) {
      logger.info('I2C', `Periféria eltávolítva: ${dev.name} [0x${address.toString(16).toUpperCase()}]`);
    }
  }

  public getDevice(address: number): II2CDevice | undefined {
    return this.devices.get(address);
  }

  public getAllDevices(): II2CDevice[] {
    return Array.from(this.devices.values());
  }

  // --- TwoWire Arduino API Implementation ---

  public begin(sda: number = 21, scl: number = 22) {
    this.txBuffer = [];
    this.rxBuffer = [];
    this.rxIndex = 0;
    logger.info('I2C', `Wire.begin(SDA: GPIO ${sda}, SCL: GPIO ${scl})`);
  }

  public beginTransmission(address: number) {
    this.txAddress = address;
    this.txBuffer = [];
    logger.trace('I2C', `Wire.beginTransmission(0x${address.toString(16).toUpperCase()})`);
  }

  public write(data: number | number[] | Uint8Array): number {
    if (typeof data === 'number') {
      this.txBuffer.push(data & 0xFF);
      return 1;
    } else if (Array.isArray(data) || data instanceof Uint8Array) {
      for (let i = 0; i < data.length; i++) {
        this.txBuffer.push(data[i] & 0xFF);
      }
      return data.length;
    }
    return 0;
  }

  public endTransmission(_sendStop: boolean = true): number {
    const device = this.devices.get(this.txAddress);
    if (!device) {
      logger.warn('I2C', `NACK: Nincs eszköz a megadott I2C címen: 0x${this.txAddress.toString(16).toUpperCase()}`);
      this.txBuffer = [];
      return 2; // NACK on address
    }

    if (this.txBuffer.length > 0) {
      const bytes = new Uint8Array(this.txBuffer);
      logger.trace('I2C', `Wire.endTransmission() -> ${bytes.length} bájt átadva: ${device.name}`);
      device.receiveBytes(bytes);
    }

    this.txBuffer = [];
    return 0; // Success (ACK)
  }

  public requestFrom(address: number, quantity: number): number {
    const device = this.devices.get(address);
    this.rxBuffer = [];
    this.rxIndex = 0;

    if (!device) {
      logger.warn('I2C', `Wire.requestFrom NACK: Eszköz nem található a 0x${address.toString(16).toUpperCase()} címen`);
      return 0;
    }

    const readBytes = device.readBytes(quantity);
    for (let i = 0; i < readBytes.length; i++) {
      this.rxBuffer.push(readBytes[i]);
    }

    logger.trace('I2C', `Wire.requestFrom(0x${address.toString(16).toUpperCase()}, ${quantity}) -> ${readBytes.length} bájt beolvasva`);
    return this.rxBuffer.length;
  }

  public available(): number {
    return this.rxBuffer.length - this.rxIndex;
  }

  public read(): number {
    if (this.rxIndex < this.rxBuffer.length) {
      const val = this.rxBuffer[this.rxIndex];
      this.rxIndex++;
      return val;
    }
    return -1;
  }

  public peek(): number {
    if (this.rxIndex < this.rxBuffer.length) {
      return this.rxBuffer[this.rxIndex];
    }
    return -1;
  }
}

export const i2cBus = new I2CBus();
