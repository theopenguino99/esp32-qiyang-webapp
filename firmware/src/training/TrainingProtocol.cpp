#include "TrainingProtocol.h"

TrainingMode TrainingProtocol::getMode() const { return _mode; }

void TrainingProtocol::setMode(TrainingMode mode) { _mode = mode; }

void TrainingProtocol::update(float /* forceKg */, uint32_t /* tsMs */) {
    switch (_mode) {
        case TrainingMode::FREE_HANG:
            // Measurement forwarded via BLE in main loop — nothing extra needed
            break;
        case TrainingMode::REPEATERS:
            // TODO (Feature #1): implement repeater state machine
            break;
        case TrainingMode::RFD:
            // TODO (Feature #1): implement RFD measurement
            break;
        default:
            break;
    }
}
