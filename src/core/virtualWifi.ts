import { VirtualWiFiState, VirtualWebServerState, MQTTMessage } from '../types/esp32';

export class VirtualWiFi {
  private state: VirtualWiFiState = {
    mode: 'OFF',
    status: 'WL_IDLE_STATUS',
    ssid: '',
    localIP: '0.0.0.0',
    subnetMask: '255.255.255.0',
    gateway: '192.168.1.1',
    rssi: -65,
    isSoftAPActive: false,
    softAPSSID: 'ESP32_AccessPoint',
    softAPIP: '192.168.4.1'
  };

  private webServer: VirtualWebServerState = {
    isRunning: false,
    port: 80,
    routes: []
  };

  private mqttLogs: MQTTMessage[] = [];

  public getState(): VirtualWiFiState {
    return { ...this.state };
  }

  public getWebServer(): VirtualWebServerState {
    return { ...this.webServer };
  }

  public getMqttLogs(): MQTTMessage[] {
    return [...this.mqttLogs];
  }

  // --- WiFi Arduino API ---

  public begin(ssid: string, _pass: string = ''): boolean {
    this.state.mode = 'STA';
    this.state.ssid = ssid;
    this.state.status = 'WL_CONNECTED';
    this.state.localIP = '192.168.1.150';
    return true;
  }

  public softAP(ssid: string, _pass: string = ''): boolean {
    this.state.mode = 'AP';
    this.state.isSoftAPActive = true;
    this.state.softAPSSID = ssid;
    return true;
  }

  public status(): string {
    return this.state.status;
  }

  public localIP(): string {
    return this.state.localIP;
  }

  public softAPIP(): string {
    return this.state.softAPIP;
  }

  // --- WebServer Arduino API ---

  public startWebServer(port: number = 80) {
    this.webServer.isRunning = true;
    this.webServer.port = port;
  }

  public registerRoute(path: string, handler: (req: any, res: any) => void, method: 'GET' | 'POST' | 'ANY' = 'GET') {
    this.webServer.routes.push({ path, handler, method });
  }

  public simulateHttpRequest(path: string, method: string = 'GET'): { status: number; body: string } {
    const route = this.webServer.routes.find(r => r.path === path && (r.method === 'ANY' || r.method === method));
    if (!route) {
      return { status: 404, body: '404 Not Found on Virtual ESP32 WebServer' };
    }

    let responseBody = '';
    let responseStatus = 200;

    const mockRes = {
      send: (status: number, _type: string, body: string) => {
        responseStatus = status;
        responseBody = body;
      }
    };

    route.handler({}, mockRes);
    return { status: responseStatus, body: responseBody };
  }

  // --- MQTT Client API ---

  public publishMqtt(topic: string, payload: string) {
    this.mqttLogs.push({
      id: 'mqtt_' + Date.now(),
      timestamp: Date.now(),
      topic,
      payload,
      direction: 'PUBLISH'
    });
  }
}

export const virtualWifi = new VirtualWiFi();
