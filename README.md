<div align="center">

<img src="assets/banner.svg" alt="crimp-ER — Force Monitor" width="640" />

**Real-time hangboard force monitor for ESP32 — train, test &amp; rehab your fingers over BLE.**

</div>

---

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

## Cloud Storage (Supabase)

Exercise history is stored in Supabase (PostgreSQL). Sessions are auto-saved when protocols complete.

### Setup

1. Create a project at [supabase.com](https://supabase.com) (free tier)
2. In the SQL editor, create the `exercise_sessions` table:
   ```sql
   CREATE TABLE exercise_sessions (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id UUID REFERENCES auth.users(id) NOT NULL,
     protocol_type TEXT NOT NULL,
     protocol_name TEXT,
     completed_at TIMESTAMPTZ DEFAULT now(),
     duration_s INT,
     peak_force REAL,
     avg_force REAL,
     sets_data JSONB,
     config JSONB
   );
   ALTER TABLE exercise_sessions ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users see own sessions" ON exercise_sessions FOR ALL USING (auth.uid() = user_id);
   ```
3. In Supabase dashboard → Authentication → Settings, disable "Confirm email" for easier signup
4. Copy your project URL and anon key, create `.env`:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
5. Restart dev server

### Auth
- Email + password (simplest, no email delivery needed)
- Sign in via the button in the bottom status bar
- App works fully offline without auth — cloud features are optional

### Future Placeholders
- Community protocol sharing (browse, import, rate)
- User profiles and training logs
- Cross-device sync

## BLE UUIDs

- Service: `6E400001-B5A3-F393-E0A9-E50E24DCCA9E`
- TX Char: `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`
