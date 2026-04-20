# ESP32 Force Monitor

Minimal web app to display real-time force measurements from ESP32 via BLE.

## Setup

```bash
npm install --force
npm run dev
```

Open `http://localhost:5173` and click Connect.

## How it works

- **App.tsx** (129 lines) - BLE connection + chart all in one component
- **Dependencies** - React, Recharts, Tailwind only
- **Data** - Parses "XX.XX kg" strings from ESP32 NUS service
- **Chart** - Real-time line chart with last 30 seconds of data

## BLE UUIDs

- Service: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- TX Char: `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`
