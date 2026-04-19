#pragma once
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <functional>

enum class DeviceCommand : uint8_t {
    TARE            = 0x01,
    START_MEASURE   = 0x02,
    STOP_MEASURE    = 0x03,
    // Future: training protocol commands (Feature #1)
    START_REPEATERS = 0x10,
    STOP_REPEATERS  = 0x11,
    START_RFD       = 0x20,
    STOP_RFD        = 0x21,
};

using CommandCallback = std::function<void(DeviceCommand)>;

class BLEManager {
public:
    void begin(const char* deviceName);
    void notifyForce(float grams, uint32_t timestampMs);
    void setCommandCallback(CommandCallback cb);
    bool isConnected() const;

private:
    BLEServer*          _server     = nullptr;
    BLECharacteristic*  _forceChar  = nullptr;
    CommandCallback     _commandCb;
    bool                _connected  = false;

    friend class ServerCallbacks;
    friend class CommandCallbacks;
};
