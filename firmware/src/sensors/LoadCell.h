#pragma once
#include <HX711.h>

class LoadCell {
public:
    LoadCell(uint8_t doutPin, uint8_t sckPin);

    void begin();
    void tare();
    float readGrams();
    bool isReady() const;
    void setCalibrationFactor(float factor);

private:
    HX711   _hx711;
    uint8_t _doutPin;
    uint8_t _sckPin;
    float   _calibrationFactor;
};
