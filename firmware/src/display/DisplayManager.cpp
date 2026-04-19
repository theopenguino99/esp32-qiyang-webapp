#include "DisplayManager.h"

void DisplayManager::begin() {
    // TODO (Feature #2): init display driver, set _initialized = true
    _initialized = false;
}

void DisplayManager::showScreen(DisplayScreen /* screen */) {
    if (!_initialized) return;
    // TODO: render screen content
}

void DisplayManager::updateForce(float /* forceKg */, float /* maxForceKg */) {
    if (!_initialized) return;
    // TODO: update force bar / value on screen
}
