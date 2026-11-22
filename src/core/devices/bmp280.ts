import { II2CDevice } from '../../types/esp32';
import { i2cBus } from '../i2cBus';
import { logger } from '../../utils/logger';

export class BMP280Device implements II2CDevice {
  public address: number;
  public name: string = 'BMP280 Barometer & Thermometer';
  
  // Real-world physical inputs
  public temperature: number = 24.5;    // in °C
  public pressure: number = 101325.0;   // in Pascals (1013.25 hPa)
  
  // Bosch Internal Registers
  private registers: Uint8Array = new Uint8Array(256);
  private currentRegisterIndex: number = 0;

  // Calibration coefficients
  private dig_T1: number = 27504;
  private dig_T2: number = 26435;
  private dig_T3: number = -1000;
  private dig_P1: number = 36477;
  private dig_P2: number = -10685;
  private dig_P3: number = 3024;
  private dig_P4: number = 2855;
  private dig_P5: number = 140;
  private dig_P6: number = -7;
  private dig_P7: number = 15500;
  private dig_P8: number = -14600;
  private dig_P9: number = 6000;

  constructor(address: number = 0x76) {
    this.address = address;
    this.initRegisters();
    i2cBus.registerDevice(this);
  }

  private initRegisters() {
    this.registers.fill(0);
    this.registers[0xD0] = 0x58; // BMP280 ID
    this.registers[0xF3] = 0x00;
    this.registers[0xF4] = 0x57; // ctrl_meas

    this.write16LE(0x88, this.dig_T1);
    this.writeS16LE(0x8A, this.dig_T2);
    this.writeS16LE(0x8C, this.dig_T3);
    this.write16LE(0x8E, this.dig_P1);
    this.writeS16LE(0x90, this.dig_P2);
    this.writeS16LE(0x92, this.dig_P3);
    this.writeS16LE(0x94, this.dig_P4);
    this.writeS16LE(0x96, this.dig_P5);
    this.writeS16LE(0x98, this.dig_P6);
    this.writeS16LE(0x9A, this.dig_P7);
    this.writeS16LE(0x9C, this.dig_P8);
    this.writeS16LE(0x9E, this.dig_P9);

    this.updateRawAdcRegisters();
    logger.info('BMP280', `Szenzor inicializálva [I2C: 0x${this.address.toString(16).toUpperCase()}, ChipID: 0x58]`);
  }

  private write16LE(addr: number, val: number) {
    this.registers[addr] = val & 0xFF;
    this.registers[addr + 1] = (val >> 8) & 0xFF;
  }

  private writeS16LE(addr: number, val: number) {
    const unsigned = val < 0 ? val + 65536 : val;
    this.write16LE(addr, unsigned);
  }

  public setEnvironmentalData(tempC: number, pressureHPa: number) {
    this.temperature = tempC;
    this.pressure = pressureHPa * 100.0;
    this.updateRawAdcRegisters();
    logger.debug('BMP280', `Környezeti adatok frissítve: ${tempC.toFixed(1)} °C | ${pressureHPa.toFixed(1)} hPa`);
  }

  private updateRawAdcRegisters() {
    const rawTemp = Math.round(((this.temperature + 40.0) / 125.0) * 524288);
    const rawPress = Math.round(((this.pressure - 30000.0) / 80000.0) * 524288);

    this.registers[0xFA] = (rawTemp >> 12) & 0xFF;
    this.registers[0xFB] = (rawTemp >> 4) & 0xFF;
    this.registers[0xFC] = (rawTemp << 4) & 0xF0;

    this.registers[0xF7] = (rawPress >> 12) & 0xFF;
    this.registers[0xF8] = (rawPress >> 4) & 0xFF;
    this.registers[0xF9] = (rawPress << 4) & 0xF0;
  }

  public readRegister(reg: number): number {
    this.updateRawAdcRegisters();
    const val = this.registers[reg & 0xFF];
    logger.trace('BMP280', `Regiszter olvasás [0x${reg.toString(16).toUpperCase()}] -> 0x${val.toString(16).toUpperCase()}`);
    return val;
  }

  public writeRegister(reg: number, data: number): void {
    this.registers[reg & 0xFF] = data & 0xFF;
    logger.trace('BMP280', `Regiszter írás [0x${reg.toString(16).toUpperCase()}] <- 0x${data.toString(16).toUpperCase()}`);
  }

  public receiveBytes(bytes: Uint8Array): void {
    if (bytes.length === 0) return;
    this.currentRegisterIndex = bytes[0];

    if (bytes.length > 1) {
      for (let i = 1; i < bytes.length; i++) {
        const targetReg = (this.currentRegisterIndex + (i - 1)) & 0xFF;
        this.registers[targetReg] = bytes[i];
      }
    }
  }

  public readBytes(count: number): Uint8Array {
    this.updateRawAdcRegisters();
    const result = new Uint8Array(count);
    for (let i = 0; i < count; i++) {
      const regAddr = (this.currentRegisterIndex + i) & 0xFF;
      result[i] = this.registers[regAddr];
    }
    return result;
  }

  public readTemperature(): number {
    return this.temperature;
  }

  public readPressure(): number {
    return this.pressure;
  }

  public readAltitude(seaLevelhPa: number = 1013.25): number {
    const pressureHPa = this.pressure / 100.0;
    const alt = 44330.0 * (1.0 - Math.pow(pressureHPa / seaLevelhPa, 0.1903));
    return alt;
  }
}

export const bmp280 = new BMP280Device(0x76);
