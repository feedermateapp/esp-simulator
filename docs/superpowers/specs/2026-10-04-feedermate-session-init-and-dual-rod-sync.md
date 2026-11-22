# FeederMate Mobile-Initiated Session & Dual-Rod Synchronization Specification

**Date:** 2026-10-04  
**Status:** Approved Design  
**Scope:** Mobile-to-ESP32 session initiation, dynamic preset override, 1-rod vs 2-rod dual-stopper layout, and target time retention.

---

## 1. Overview & Objectives

When an angler creates or starts a fishing session in the **FeederPulse Mobile App** (in Casual, Practice, or Competition mode), the app transmits a rich `START_SESSION` configuration payload over the Nordic UART Service (NUS) to the **FeederMate ESP32 Hardware Companion**.

The ESP32 companion automatically:
1. Resets counters (casts, catches, keepnets) for a fresh session.
2. Applies the session mode (`casual`, `practice`, `competition`) and configuration.
3. Switches to **1-Rod** (Single Hero Stopper) or **2-Rod** (Dual Split Stopper) layout based on `rodCount`.
4. Overrides distance and timer preset lists with the session-specific presets.
5. Remembers the last selected preset / target time for all subsequent casts on each rod.

---

## 2. Inbound Protocol: `START_SESSION` JSON Format

```json
{
  "cmd": "START_SESSION",
  "sessionId": "sess_1728039000",
  "sessionType": "casual",
  "rodCount": 2,
  "distancePresets": [35, 50, 65, 80],
  "castPresets": [120, 300, 420, 600, 900],
  "keepnetLimitKg": 20.0,
  "species": [
    {"name": "PONTY", "weight": 2.0},
    {"name": "KARASZ", "weight": 0.5},
    {"name": "DEVER", "weight": 0.8},
    {"name": "AMUR", "weight": 3.5}
  ]
}
```

### Protocol Handling Rules:
- If `rodCount` is omitted, default is `1`.
- If `distancePresets` is omitted, default dynamic fine-tuner (15–120m) is used.
- If `castPresets` is omitted, the default presets (2m, 5m, 7m, 10m, 15m, Custom) are used.
- ESP32 responds immediately with:
  ```json
  {"type":"ACK","cmd":"START_SESSION","status":"ok","sessionId":"sess_1728039000"}
  ```

---

## 3. UI Layout & Dual-Rod Behavior (320x240 Display)

### 3.1 1-Rod Mode (`rodCount = 1`)
- Hero Stopper Card (`216x114px`): Full size, Size 5 centered countdown digits (`05:00`), 6px progress bar.
- Right Widgets (`88px`): Distance, Session Timer, Cast Count / Fastest Bite.
- Bottom Keepnet Card (`216x88px`): Keepnet #1 badge, weight, count, 20kg limit bar, total weight/count.

### 3.2 2-Rod Mode (`rodCount = 2`)
- **Hero Stopper Area (`216x114px`) is split horizontally:**
  - **Bot #1 Card (`216x55px`, Y: 30..85):**
    - Header: `[BOT #1: 05:00]` badge | Status: `FUT ●` (Green), `TÚLIDŐ ⚠` (Red), `ÁLL ○` (Gray).
    - Digits: Size 3 crisp centered countdown (`04:32`).
    - Bottom: 3px mini progress bar.
  - **Bot #2 Card (`216x55px`, Y: 89..144):**
    - Header: `[BOT #2: 10:00]` badge | Status badge.
    - Digits: Size 3 crisp centered countdown (`08:15`).
    - Bottom: 3px mini progress bar.
- **Active Focus & Selection:**
  - The focused rod has a distinct yellow accent border (`COLOR_YELLOW`).
  - Pressing the **Rotary Encoder SW button** on the Dashboard toggles active focus: `Bot #1` $\longleftrightarrow$ `Bot #2`.
  - Pressing **D14 (KO button)** starts/re-casts the currently focused rod.
  - Rotating the encoder adjusts the focused rod's preset target time for the next cast.
- **Target Time & Distance Retention Rule:**
  - Each rod independently preserves its last set `targetSeconds` and last set `currentDistanceM`.
  - When switching focus between `Bot #1` and `Bot #2`, the Right Distance Widget dynamically reflects the focused rod's current distance.
  - Adjusting distance updates the focused rod's distance and retains it for all future casts on that rod.
  - Re-casting a rod always starts with the last active target time and distance for that specific rod.

---

## 4. Hardware Event Stream (Outbound JSON to Mobile)

When casts are made on 1-rod or 2-rod sessions:
```json
{"type":"CAST_STARTED","rod":1,"castCount":4,"targetSec":300,"distanceM":65,"ts":1728039000}
```
When a catch is logged:
```json
{"type":"CATCH_ADDED","rod":1,"species":"PONTY","weightKg":2.0,"keepnet":1,"totalKg":18.5,"fishCount":12,"ts":1728039000}
```
Heartbeat telemetry (5 Hz / 5s interval):
```json
{
  "type": "HEARTBEAT",
  "rodCount": 2,
  "activeRod": 1,
  "rod1": {"running": true, "elapsedSec": 145, "targetSec": 300, "casts": 4},
  "rod2": {"running": true, "elapsedSec": 412, "targetSec": 600, "casts": 2},
  "fishCount": 12,
  "totalWeightKg": 18.5,
  "keepnet1Kg": 18.5,
  "keepnet2Kg": 0.0
}
```
