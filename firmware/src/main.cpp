#include <Arduino.h>
#include "config.h"
#include "ble/BLEManager.h"
#include "sensors/LoadCell.h"
#include "display/DisplayManager.h"
#include "training/TrainingProtocol.h"

static BLEManager        ble;
static LoadCell          loadCell(HX711_DOUT_PIN, HX711_SCK_PIN);
static DisplayManager    display;
static TrainingProtocol  training;

static uint32_t lastNotifyMs = 0;

void setup() {
    Serial.begin(115200);

    loadCell.begin();
    Serial.println("[LoadCell] initialized");

    display.begin(); // no-op until display hardware is wired (Feature #2)

    ble.begin(BLE_DEVICE_NAME);
    ble.setCommandCallback([](DeviceCommand cmd) {
        switch (cmd) {
            case DeviceCommand::TARE:
                loadCell.tare();
                Serial.println("[BLE] tare");
                break;
            case DeviceCommand::START_MEASURE:
                training.setMode(TrainingMode::FREE_HANG);
                break;
            case DeviceCommand::STOP_MEASURE:
                training.setMode(TrainingMode::IDLE);
                break;
            // TODO (Feature #1): handle START_REPEATERS, START_RFD etc.
            default:
                break;
        }
    });

    Serial.printf("[BLE] advertising as \"%s\"\n", BLE_DEVICE_NAME);
}

void loop() {
    const uint32_t now = millis();

    if (now - lastNotifyMs < NOTIFY_INTERVAL_MS) return;
    lastNotifyMs = now;

    const float grams = loadCell.readGrams();
    training.update(grams / 1000.0f, now);
    display.updateForce(grams / 1000.0f, MAX_FORCE_GRAMS / 1000.0f);

    if (ble.isConnected()) {
        ble.notifyForce(grams, now);
    }

    // 1 Hz serial debug
    static uint32_t lastDebugMs = 0;
    if (now - lastDebugMs >= 1000) {
        lastDebugMs = now;
        Serial.printf("[Force] %.1f g  BLE: %s\n", grams, ble.isConnected() ? "connected" : "waiting");
    }
}
