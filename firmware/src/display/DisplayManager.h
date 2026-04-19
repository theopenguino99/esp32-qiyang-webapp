#pragma once

// Feature #2: on-device display for standalone use.
// TODO: Choose driver (e.g. U8g2 for SSD1306 OLED, TFT_eSPI for colour TFT),
//       enable DISPLAY_SDA/SCL pins in config.h, add lib_dep in platformio.ini,
//       and uncomment hardware init in DisplayManager.cpp.

enum class DisplayScreen {
    SPLASH,
    FORCE_LIVE,
    TRAINING_MENU,   // Feature #3
    TRAINING_ACTIVE, // Feature #3
    SETTINGS,
};

class DisplayManager {
public:
    void begin();
    void showScreen(DisplayScreen screen);
    void updateForce(float forceKg, float maxForceKg);

    // Feature #3 stubs — implement when training protocols are ready
    // void showTrainingMenu(const TrainingConfig& cfg);
    // void showTrainingActive(const TrainingState& state);

private:
    bool _initialized = false;
};
