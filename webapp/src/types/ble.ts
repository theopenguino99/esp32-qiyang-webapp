export interface ForceReading {
  forceKg: number
  timestampMs: number
  receivedAt: number // local Date.now()
}

export type DeviceStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Placeholders for future training modes (Feature #1)
export type TrainingMode = 'idle' | 'free_hang' | 'repeaters' | 'rfd'

export const BLE_UUIDS = {
  service:             '4fafc201-1fb5-459e-8fcc-c5c9c331914b',
  forceCharacteristic: 'beb5483e-36e1-4688-b7f5-ea07361b26a8',
  commandCharacteristic: 'beb5483f-36e1-4688-b7f5-ea07361b26a8',
} as const

export enum DeviceCommand {
  TARE            = 0x01,
  START_MEASURE   = 0x02,
  STOP_MEASURE    = 0x03,
  // Future: training protocol commands (Feature #1)
  START_REPEATERS = 0x10,
  STOP_REPEATERS  = 0x11,
  START_RFD       = 0x20,
  STOP_RFD        = 0x21,
}
