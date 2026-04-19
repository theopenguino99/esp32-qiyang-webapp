#pragma once

// ─── Pin assignments ───────────────────────────────────────────────────────
#define HX711_DOUT_PIN  21
#define HX711_SCK_PIN   22

// Display (Feature #2) — define pins when hardware is wired
// #define DISPLAY_SDA_PIN  23
// #define DISPLAY_SCL_PIN  19

// ─── BLE ──────────────────────────────────────────────────────────────────
#define BLE_DEVICE_NAME   "ClimbingTrainer"
#define SERVICE_UUID      "4fafc201-1fb5-459e-8fcc-c5c9c331914b"
#define FORCE_CHAR_UUID   "beb5483e-36e1-4688-b7f5-ea07361b26a8"
#define CMD_CHAR_UUID     "beb5483f-36e1-4688-b7f5-ea07361b26a8"
#define STATUS_CHAR_UUID  "beb54840-36e1-4688-b7f5-ea07361b26a8"

// ─── Load cell ────────────────────────────────────────────────────────────
// Run the calibration procedure once and replace this value.
// Method: tare with no load, place a known weight (e.g. 1 kg dumbbell),
// then set CALIBRATION_FACTOR = raw_reading / known_weight_in_grams.
#define CALIBRATION_FACTOR  -7050.0f
#define MAX_FORCE_GRAMS      20000
#define TARE_SAMPLES         10

// ─── Sampling ─────────────────────────────────────────────────────────────
#define NOTIFY_INTERVAL_MS  25   // 40 Hz BLE notifications
