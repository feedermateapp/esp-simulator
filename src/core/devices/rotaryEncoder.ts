import { gpioManager } from '../gpioManager';
import { logger } from '../../utils/logger';

export class RotaryEncoderDevice {
  public clkPin: number;
  public dtPin: number;
  public swPin: number;
  private position: number = 0;
  private isPressed: boolean = false;

  constructor(clkPin: number = 19, dtPin: number = 21, swPin: number = 22) {
    this.clkPin = clkPin;
    this.dtPin = dtPin;
    this.swPin = swPin;
    this.initPins();
  }

  public configurePins(clkPin: number, dtPin: number, swPin: number) {
    if (this.clkPin !== clkPin || this.dtPin !== dtPin || this.swPin !== swPin) {
      this.clkPin = clkPin;
      this.dtPin = dtPin;
      this.swPin = swPin;
      this.initPins();
    }
  }

  public initPins() {
    gpioManager.setPinMode(this.clkPin, 'INPUT_PULLUP');
    gpioManager.setPinMode(this.dtPin, 'INPUT_PULLUP');
    gpioManager.setPinMode(this.swPin, 'INPUT_PULLUP');

    gpioManager.writeDigital(this.clkPin, 1);
    gpioManager.writeDigital(this.dtPin, 1);
    gpioManager.writeDigital(this.swPin, 1);

    logger.info('ROTARY', `KY-040 Jeladó inicializálva [CLK: ${this.clkPin}, DT: ${this.dtPin}, SW: ${this.swPin}]`);
  }

  public getPosition(): number {
    return this.position;
  }

  public getIsPressed(): boolean {
    return this.isPressed;
  }

  public rotate(direction: 'CW' | 'CCW') {
    if (direction === 'CW') {
      this.position++;
      logger.debug('ROTARY', `↻ Forgatás Jobbra (CW) | Új pozíció: ${this.position}`);

      // 4-step Gray code
      gpioManager.writeDigital(this.clkPin, 0);
      gpioManager.writeDigital(this.dtPin, 1);
      gpioManager.writeDigital(this.clkPin, 0);
      gpioManager.writeDigital(this.dtPin, 0);
      gpioManager.writeDigital(this.clkPin, 1);
      gpioManager.writeDigital(this.dtPin, 0);
      gpioManager.writeDigital(this.clkPin, 1);
      gpioManager.writeDigital(this.dtPin, 1);
    } else {
      this.position--;
      logger.debug('ROTARY', `↺ Forgatás Balra (CCW) | Új pozíció: ${this.position}`);

      gpioManager.writeDigital(this.clkPin, 1);
      gpioManager.writeDigital(this.dtPin, 0);
      gpioManager.writeDigital(this.clkPin, 0);
      gpioManager.writeDigital(this.dtPin, 0);
      gpioManager.writeDigital(this.clkPin, 0);
      gpioManager.writeDigital(this.dtPin, 1);
      gpioManager.writeDigital(this.clkPin, 1);
      gpioManager.writeDigital(this.dtPin, 1);
    }
  }

  public pressButton() {
    this.isPressed = true;
    logger.debug('ROTARY', `Gomb lenyomva (SW GPIO ${this.swPin} -> LOW)`);
    gpioManager.writeDigital(this.swPin, 0);
  }

  public releaseButton() {
    this.isPressed = false;
    logger.debug('ROTARY', `Gomb felengedve (SW GPIO ${this.swPin} -> HIGH)`);
    gpioManager.writeDigital(this.swPin, 1);
  }

  public reset(position: number = 0) {
    this.position = position;
    this.isPressed = false;
    this.initPins();
  }
}

export const rotaryEncoder = new RotaryEncoderDevice(19, 21, 22);
