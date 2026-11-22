import { VirtualBLEState } from '../types/esp32';

export class VirtualBLE {
  private state: VirtualBLEState = {
    isAdvertising: false,
    deviceName: 'ESP32_BLE_Device',
    services: [],
    connectedClients: 0
  };

  private notifyListeners: Map<string, (val: string) => void> = new Map();

  public getState(): VirtualBLEState {
    return { ...this.state };
  }

  public init(deviceName: string) {
    this.state.deviceName = deviceName;
  }

  public createService(uuid: string, name?: string) {
    const service = {
      uuid,
      name: name || 'Custom Service',
      characteristics: []
    };
    this.state.services.push(service);
    return service;
  }

  public addCharacteristic(serviceUuid: string, charUuid: string, properties: ('READ' | 'WRITE' | 'NOTIFY')[]) {
    const service = this.state.services.find(s => s.uuid === serviceUuid);
    if (service) {
      const char = {
        uuid: charUuid,
        properties,
        value: '',
        lastUpdated: Date.now()
      };
      service.characteristics.push(char);
      return char;
    }
  }

  public setValue(charUuid: string, value: string) {
    for (const s of this.state.services) {
      const c = s.characteristics.find(ch => ch.uuid === charUuid);
      if (c) {
        c.value = value;
        c.lastUpdated = Date.now();
        // Trigger notify callback if subscribed
        const listener = this.notifyListeners.get(charUuid);
        if (listener) {
          listener(value);
        }
        break;
      }
    }
  }

  public startAdvertising() {
    this.state.isAdvertising = true;
  }

  public subscribe(charUuid: string, callback: (val: string) => void) {
    this.notifyListeners.set(charUuid, callback);
  }
}

export const virtualBle = new VirtualBLE();
