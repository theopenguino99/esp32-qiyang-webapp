#include "BLEManager.h"
#include "../config.h"
#include <cstring>

class ServerCallbacks : public BLEServerCallbacks {
public:
    explicit ServerCallbacks(BLEManager& mgr) : _mgr(mgr) {}

    void onConnect(BLEServer*) override {
        _mgr._connected = true;
    }

    void onDisconnect(BLEServer* server) override {
        _mgr._connected = false;
        server->startAdvertising();
    }

private:
    BLEManager& _mgr;
};

class CommandCallbacks : public BLECharacteristicCallbacks {
public:
    explicit CommandCallbacks(BLEManager& mgr) : _mgr(mgr) {}

    void onWrite(BLECharacteristic* ch) override {
        if (!_mgr._commandCb) return;
        auto val = ch->getValue();
        if (val.empty()) return;
        _mgr._commandCb(static_cast<DeviceCommand>(val[0]));
    }

private:
    BLEManager& _mgr;
};

void BLEManager::begin(const char* deviceName) {
    BLEDevice::init(deviceName);

    _server = BLEDevice::createServer();
    _server->setCallbacks(new ServerCallbacks(*this));

    BLEService* svc = _server->createService(SERVICE_UUID);

    _forceChar = svc->createCharacteristic(FORCE_CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
    _forceChar->addDescriptor(new BLE2902());

    BLECharacteristic* cmdChar = svc->createCharacteristic(CMD_CHAR_UUID, BLECharacteristic::PROPERTY_WRITE);
    cmdChar->setCallbacks(new CommandCallbacks(*this));

    // STATUS_CHAR reserved for future device state reporting (Feature #2/#3)
    BLECharacteristic* statusChar = svc->createCharacteristic(
        STATUS_CHAR_UUID,
        BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    statusChar->addDescriptor(new BLE2902());

    svc->start();

    BLEAdvertising* adv = BLEDevice::getAdvertising();
    adv->addServiceUUID(SERVICE_UUID);
    adv->setScanResponse(true);
    BLEDevice::startAdvertising();
}

// Packet layout (8 bytes, little-endian):
//   [0..3] uint32 — force in grams
//   [4..7] uint32 — device uptime in ms
void BLEManager::notifyForce(float grams, uint32_t timestampMs) {
    if (!_connected) return;

    uint8_t packet[8];
    uint32_t forceInt = static_cast<uint32_t>(grams);
    memcpy(packet,     &forceInt,    4);
    memcpy(packet + 4, &timestampMs, 4);

    _forceChar->setValue(packet, sizeof(packet));
    _forceChar->notify();
}

void BLEManager::setCommandCallback(CommandCallback cb) {
    _commandCb = std::move(cb);
}

bool BLEManager::isConnected() const {
    return _connected;
}
