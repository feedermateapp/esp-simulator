# Wi-Fi és Bluetooth (BLE) Szimuláció Specifikáció (WiFi & Bluetooth Spec)

Ez a dokumentum rögzíti az ESP32 beépített **Wi-Fi** és **Bluetooth / BLE (Bluetooth Low Energy)** alrendszereinek szimulációját, a virtuális webkiszolgálót, az MQTT klienst, a Bluetooth soros terminált és a BLE GATT szervert.

---

## 1. Wi-Fi Rendszer Szimuláció

A szimulátor teljes értékű hálózati réteget biztosít az ESP32 kódok számára:

```mermaid
graph TD
    subgraph ESP["ESP32 Virtual Microcontroller"]
        WiFiLib[WiFi Library - STA / AP Mode]
        WebServerLib[WebServer / AsyncWebServer]
        MQTTLib[PubSubClient / MQTT Client]
        HTTPClientLib[HTTPClient - REST API]
    end

    subgraph SimUI["Simulator Networking UI"]
        BrowserTab[Virtuális Böngésző Panel (Mini Browser)]
        MQTTBroker[MQTT Üzenetnapló & Témák (Topics)]
        NetworkStatus[Hálózati Állapotjelző (IP, RSSI, SSID)]
    end

    WiFiLib --> NetworkStatus
    WebServerLib <--> BrowserTab
    MQTTLib <--> MQTTBroker
```

### A. Wi-Fi Módok és API Támogatás
1. **Station Mód (STA - Csatlakozás routerhez):**
   - `WiFi.begin(ssid, password)`
   - `WiFi.status()` -> `WL_CONNECTED`, `WL_DISCONNECTED`, `WL_IDLE_STATUS`
   - `WiFi.localIP()` -> Szimulált IP cím (pl. `192.168.1.150`)
   - `WiFi.RSSI()` -> Jelerősség (-65 dBm)
2. **Access Point Mód (SoftAP - Saját Wi-Fi hálózat létrehozása):**
   - `WiFi.softAP(ssid, password)`
   - `WiFi.softAPIP()` -> `192.168.4.1`

### B. Virtuális Webkiszolgáló (WebServer & Mini Browser Tab)
- Amikor a kód elindít egy webszervert:
  ```cpp
  WebServer server(80);
  server.on("/", []() {
    server.send(200, "text/html", "<h1>ESP32 Weather Station</h1><p>Temp: 24.5 C</p>");
  });
  server.on("/toggle_led", []() {
    digitalWrite(2, !digitalRead(2));
    server.send(200, "text/plain", "OK");
  });
  server.begin();
  ```
- A szimulátorban automatikusan aktiválódik egy **Virtuális Böngésző Tab** (`http://192.168.4.1` vagy `http://192.168.1.150`), ahol a felhasználó élőben láthatja és kattinthatja az ESP32 által kiszolgált HTML oldalt!

### C. MQTT Kliens (PubSubClient Szimuláció)
- `client.connect("ESP32_Client")`
- `client.publish("home/weather/temperature", "24.5")`
- `client.subscribe("home/relays/control")`
- A felületen egy beépített MQTT panel mutatja az elküldött (Published) és fogadott (Received) üzeneteket, valamint tesztüzeneteket lehet beküldeni a szimulált mikrokontrollernek.

---

## 2. Bluetooth & BLE (Bluetooth Low Energy) Szimuláció

Az ESP32 kettős Bluetooth rádióval rendelkezik: **Bluetooth Classic (Serial)** és **BLE (GATT Server / Client)**.

```mermaid
graph TD
    subgraph ESP_BT["ESP32 Bluetooth Engine"]
        BTSerial[BluetoothSerial - SPP Profile]
        BLEServer[BLE GATT Server]
        BLEChar[BLE Characteristics - Read/Write/Notify]
    end

    subgraph UI_BT["Simulator Bluetooth Interface"]
        BTTerminal[Bluetooth Soros Terminál (Mobil nézet)]
        GATTExplorer[BLE GATT Explorer - Élő Szenzor Értesítések]
    end

    BTSerial <--> BTTerminal
    BLEServer <--> GATTExplorer
    BLEChar <--> GATTExplorer
```

### A. Bluetooth Classic Soros Port (`BluetoothSerial`)
- Gyors vezeték nélküli soros adatátvitel emulációja:
  ```cpp
  BluetoothSerial SerialBT;
  SerialBT.begin("ESP32_Weather_BT");
  SerialBT.println("Bluetooth kapcsolat aktív!");
  ```
- A szimulátorban egy dedikált **Bluetooth Terminal** fülön lehet üzeneteket küldeni és fogadni, mintha egy okostelefon csatlakozna.

### B. BLE (Bluetooth Low Energy) GATT Szerver
- **Környezeti Érzékelő Profil (Environmental Sensing Service - UUID `0x181A`):**
  - **Hőmérséklet Karakterisztika (UUID `0x2A6E`):** Érték olvasás és valós idejű `NOTIFY` értesítések küldése.
  - **Légnyomás Karakterisztika (UUID `0x2A6D`):** Érték olvasás és `NOTIFY`.
  - **Vezérlő Karakterisztika:** Írható karakterisztika (Write with Response / Without Response) LED-ek kapcsolására és konfiguráció módosítására.
- **BLE GATT Explorer Panel a UI-ban:**
  - Keresés (Scan) a szimulált eszközökre.
  - Szolgáltatások (Services) és Karakterisztikák listázása.
  - Élő feliratkozás (Subscribe to Notifications): a BMP280 hőmérséklet csúszka mozgatásakor az érték azonnal megjelenik a BLE felületen!
