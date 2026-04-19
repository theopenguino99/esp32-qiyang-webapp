#include "LoadCell.h"
#include "../config.h"

LoadCell::LoadCell(uint8_t doutPin, uint8_t sckPin)
    : _doutPin(doutPin), _sckPin(sckPin), _calibrationFactor(CALIBRATION_FACTOR) {}

void LoadCell::begin() {
    _hx711.begin(_doutPin, _sckPin);
    _hx711.set_scale(_calibrationFactor);
    tare();
}

void LoadCell::tare() {
    _hx711.tare(TARE_SAMPLES);
}

// Returns force in grams; clamps noise below zero.
// Assumes calibration factor is set so get_units() returns grams.
float LoadCell::readGrams() {
    if (!_hx711.is_ready()) return 0.0f;
    float grams = _hx711.get_units(1);
    return grams < 0.0f ? 0.0f : grams;
}

bool LoadCell::isReady() const {
    return _hx711.is_ready();
}

void LoadCell::setCalibrationFactor(float factor) {
    _calibrationFactor = factor;
    _hx711.set_scale(factor);
}
