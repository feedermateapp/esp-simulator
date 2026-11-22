import { 
  GPIOPinState, 
  PinMode, 
  InterruptMode, 
  PinChangeListener, 
  InterruptCallback,
  RegisteredInterrupt 
} from '../types/esp32';
import { logger } from '../utils/logger';

export class GPIOManager {
  private pins: Map<number, GPIOPinState> = new Map();
  private interrupts: Map<number, RegisteredInterrupt[]> = new Map();
  private listeners: Set<PinChangeListener> = new Set();

  constructor() {
    this.resetAllPins();
  }

  public resetAllPins() {
    this.pins.clear();
    this.interrupts.clear();

    logger.debug('GPIO', 'Resetting all 40 ESP32 GPIO pins to default states');

    for (let pin = 0; pin <= 39; pin++) {
      const defaultState: GPIOPinState = {
        pin,
        mode: 'INPUT',
        digitalValue: 0,
        analogValue: 0,
        pwmDuty: 0,
        voltage: 0.0,
        isPwm: false,
        lastChanged: 0
      };

      if ([18, 19, 23, 4, 5].includes(pin)) {
        defaultState.mode = 'INPUT_PULLUP';
        defaultState.digitalValue = 1;
        defaultState.voltage = 3.3;
      }

      this.pins.set(pin, defaultState);
    }
  }

  public getPinState(pin: number): GPIOPinState {
    const state = this.pins.get(pin);
    if (!state) {
      const newState: GPIOPinState = {
        pin,
        mode: 'INPUT',
        digitalValue: 0,
        analogValue: 0,
        pwmDuty: 0,
        voltage: 0.0,
        isPwm: false,
        lastChanged: 0
      };
      this.pins.set(pin, newState);
      return newState;
    }
    return state;
  }

  public getAllPinStates(): Map<number, GPIOPinState> {
    return new Map(this.pins);
  }

  public onPinChange(listener: PinChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(pin: number, state: GPIOPinState) {
    this.listeners.forEach(listener => listener(pin, { ...state }));
  }

  // --- Arduino Pin Operations ---

  public setPinMode(pin: number, mode: PinMode) {
    const state = this.getPinState(pin);
    state.mode = mode;

    if (mode === 'INPUT_PULLUP') {
      state.digitalValue = 1;
      state.voltage = 3.3;
    } else if (mode === 'INPUT_PULLDOWN' || mode === 'OUTPUT') {
      if (state.mode !== 'INPUT_PULLUP') {
        state.digitalValue = 0;
        state.voltage = 0.0;
      }
    }

    logger.debug('GPIO', `pinMode(GPIO ${pin}, ${mode}) -> Digital: ${state.digitalValue}, Voltage: ${state.voltage}V`);
    this.notify(pin, state);
  }

  public writeDigital(pin: number, value: 0 | 1 | boolean | number) {
    const state = this.getPinState(pin);
    const newDigitalValue: 0 | 1 = (value === 1 || value === true || Number(value) > 0) ? 1 : 0;
    const oldDigitalValue = state.digitalValue;

    if (oldDigitalValue === newDigitalValue) return;

    state.digitalValue = newDigitalValue;
    state.voltage = newDigitalValue === 1 ? 3.3 : 0.0;
    state.analogValue = newDigitalValue === 1 ? 4095 : 0;
    state.lastChanged = performance.now() * 1000;

    logger.trace('GPIO', `digitalWrite(GPIO ${pin}, ${newDigitalValue}) [${oldDigitalValue} -> ${newDigitalValue}]`);
    this.notify(pin, state);
    this.dispatchInterrupts(pin, oldDigitalValue, newDigitalValue);
  }

  public readDigital(pin: number): 0 | 1 {
    const state = this.getPinState(pin);
    logger.trace('GPIO', `digitalRead(GPIO ${pin}) -> ${state.digitalValue}`);
    return state.digitalValue;
  }

  public writePwm(pin: number, duty: number) {
    const state = this.getPinState(pin);
    const clampedDuty = Math.max(0, Math.min(255, Math.round(duty)));
    state.isPwm = clampedDuty > 0;
    state.pwmDuty = clampedDuty;
    state.voltage = (clampedDuty / 255) * 3.3;
    state.digitalValue = clampedDuty > 127 ? 1 : 0;
    logger.debug('GPIO', `analogWrite/PWM(GPIO ${pin}, ${clampedDuty}/255) -> ${(state.voltage).toFixed(2)}V`);
    this.notify(pin, state);
  }

  public writeAnalog(pin: number, adcValue: number) {
    const state = this.getPinState(pin);
    const clampedAdc = Math.max(0, Math.min(4095, Math.round(adcValue)));
    state.analogValue = clampedAdc;
    state.voltage = (clampedAdc / 4095) * 3.3;
    state.digitalValue = clampedAdc > 2048 ? 1 : 0;
    logger.debug('GPIO', `ADC Input(GPIO ${pin}, ${clampedAdc}) -> ${(state.voltage).toFixed(2)}V`);
    this.notify(pin, state);
  }

  public readAnalog(pin: number): number {
    const state = this.getPinState(pin);
    logger.trace('GPIO', `analogRead(GPIO ${pin}) -> ${state.analogValue}`);
    return state.analogValue;
  }

  // --- Interrupt Dispatcher ---

  public attachInterrupt(pin: number, callback: InterruptCallback, mode: InterruptMode) {
    let pinInterrupts = this.interrupts.get(pin);
    if (!pinInterrupts) {
      pinInterrupts = [];
      this.interrupts.set(pin, pinInterrupts);
    }
    pinInterrupts.push({ pin, callback, mode });
    logger.info('INTERRUPT', `attachInterrupt(GPIO ${pin}, ${mode}) regisztrálva`);
  }

  public detachInterrupt(pin: number) {
    this.interrupts.delete(pin);
    logger.info('INTERRUPT', `detachInterrupt(GPIO ${pin}) törölve`);
  }

  private dispatchInterrupts(pin: number, oldValue: 0 | 1, newValue: 0 | 1) {
    const pinInterrupts = this.interrupts.get(pin);
    if (!pinInterrupts || pinInterrupts.length === 0) return;

    for (const inter of pinInterrupts) {
      let shouldTrigger = false;

      if (inter.mode === 'CHANGE') {
        shouldTrigger = true;
      } else if (inter.mode === 'FALLING' && oldValue === 1 && newValue === 0) {
        shouldTrigger = true;
      } else if (inter.mode === 'RISING' && oldValue === 0 && newValue === 1) {
        shouldTrigger = true;
      } else if (inter.mode === 'ONLOW' && newValue === 0) {
        shouldTrigger = true;
      } else if (inter.mode === 'ONHIGH' && newValue === 1) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        logger.debug('INTERRUPT', `⚡ ISR Triggered on GPIO ${pin} [Edge: ${inter.mode}, ${oldValue} -> ${newValue}]`);
        try {
          inter.callback();
        } catch (err: any) {
          logger.error('INTERRUPT', `Hiba az ISR futásakor (GPIO ${pin}): ${err.message || err}`, err);
        }
      }
    }
  }
}

export const gpioManager = new GPIOManager();
