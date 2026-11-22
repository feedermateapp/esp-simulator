# Context for Autonomous AI Agents

Welcome to the **ESP32 Desktop Hardware Simulator** project.

Before making any code changes, please read the core documentation:
- `AI_INSTRUCTIONS.md`: Core non-negotiable coding rules and hardware invariants.
- `docs/ARCHITECTURE.md`: High-level system architecture and component communication.
- `docs/HARDWARE_SPECIFICATIONS.md`: Exact pinout mappings, Gray code transitions, I2C register maps.
- `docs/SIMULATOR_ENGINE_SPEC.md`: Arduino C++ API compatibility layer and execution engine.
- `docs/PROJECT_MANAGEMENT_SPEC.md`: Multi-file project structure and `circuit.json` format.
- `docs/WIFI_BLUETOOTH_SPEC.md`: Virtual WiFi, WebServer, MQTT, and BLE GATT server.
- `docs/AI_DEVELOPMENT_GUIDE.md`: Step-by-step milestone development plan with verification tests.

## Fast Verification
To check TypeScript type correctness after edits:
```bash
npx tsc --noEmit
```

## Physical ESP32 Hardware Build & Upload
To compile and flash the firmware directly to the connected physical ESP32 board using the bundled `tools/arduino-cli`:

1. **List connected serial ports and boards:**
```bash
./tools/arduino-cli board list
```

2. **Compile firmware:**
```bash
./tools/arduino-cli compile --fqbn esp32:esp32:esp32 firmware/feedermate_step1
```

3. **Compile & Upload in one step (megbízható 115200 baud sebességgel):**
```bash
./tools/arduino-cli compile --fqbn esp32:esp32:esp32:UploadSpeed=115200 -u -p /dev/cu.usbserial-210 firmware/feedermate_step1
```

> **Note:** Serial upload and `/Users/laszlominczer/Library/Arduino15/` core library access requires running the command with `BypassSandbox: true`.
