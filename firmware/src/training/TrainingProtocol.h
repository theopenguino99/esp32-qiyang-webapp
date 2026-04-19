#pragma once
#include <cstdint>

// Feature #1: structured training protocol state machines.
// Repeaters and RFD are placeholders — implement state machines here.

enum class TrainingMode : uint8_t {
    IDLE      = 0,
    FREE_HANG = 1, // Current MVP: continuous force measurement
    REPEATERS = 2, // TODO: timed hang/rest intervals
    RFD       = 3, // TODO: rate-of-force-development test
};

struct RepeaterConfig {
    uint8_t  sets;
    uint8_t  repsPerSet;
    uint16_t workDurationMs;
    uint16_t restDurationMs;
    uint16_t setRestDurationMs;
    float    targetForceKg;
};

struct RFDConfig {
    uint16_t measureDurationMs;
    uint16_t restBetweenAttemptsMs;
    uint8_t  attempts;
};

class TrainingProtocol {
public:
    TrainingMode getMode() const;
    void         setMode(TrainingMode mode);
    void         update(float currentForceKg, uint32_t timestampMs);

    // TODO (Feature #1): uncomment and implement when ready
    // void startRepeaters(const RepeaterConfig& cfg);
    // void startRFD(const RFDConfig& cfg);

private:
    TrainingMode _mode = TrainingMode::FREE_HANG;
};
