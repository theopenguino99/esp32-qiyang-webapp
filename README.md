# ESP32 Force Monitor

Minimal web app to display real-time force measurements from ESP32 via BLE.

## Setup

```bash
npm install --force   # one-time only — installs dependencies
npm run dev           # start the dev server
```

> `--force` is needed because `react-router-dom@7` expects React 19, but the project uses React 18. This is safe — the app works fine on React 18. You only need to re-run `npm install` if you delete `node_modules` or change `package.json`.

Open `http://localhost:5173` and click Connect.

## Features

### 🏋️ Training
- **Repeaters** — 7/3 strength-endurance protocol with configurable work/rest/sets and real-time force chart
- **Max Hangs** — Heavy load (10s default), long rest (3min), configurable number of hangs
- **Density Hangs** — High volume submaximal hangs (7s on / 3s off × 30 sets) for tendon conditioning

### 📊 Testing
- **MVC Test** — 5-second max pull to find peak force
- **Critical Force** — Intermittent 7s on / 3s off test; CF = average of last 6 rep averages
- **Rate of Force Development** — Measures how fast force is produced from zero (peak ÷ time to peak)
- **Endurance** — Coming soon

### 🩹 Rehab
- **Progressive Loading** — Gradual force increase from start% to end% of known max
- **Submaximal Isometrics** — Long holds (30s) at low intensity (30% max) for tendon healing
- **Tendon Gliding** — Coming soon

### ⚖️ Calibration
Two-point calibration: tare (zero offset) + known weight (scale factor). See [Calibration](#load-cell-calibration).

### 🛠️ Custom Protocols
- **Create** — Build custom work/rest/sets/reps protocols with target force
- **My Protocols** — Saved to localStorage, run with full timer UI
- **Community** — Placeholder for cloud-based protocol sharing (coming soon)

## Load Cell Calibration

1. **Tare (Zero)** — Remove all weight, sample 3s → sets offset
2. **Known Weight** — Hang known weight, sample 3s → computes `scaleFactor = knownWeight / (rawAvg - offset)`

Calibrated force = `(raw - offset) × scaleFactor`. Saved to `localStorage`.

## Data Storage Placeholders

The following features have TODO placeholders for future cloud storage integration:
- User authentication (OAuth / email)
- Sync custom protocols across devices
- Community protocol sharing (upload, download, rate, review)
- User profiles and training history
- Protocol versioning and forking

## BLE UUIDs

- Service: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- TX Char: `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`
