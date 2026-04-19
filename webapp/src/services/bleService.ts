import { BLE_UUIDS, DeviceCommand, type ForceReading } from '../types/ble'

type ForceCallback = (reading: ForceReading) => void
type DisconnectCallback = () => void

// Packet layout (8 bytes, little-endian, matches firmware BLEManager.cpp):
//   [0..3] uint32 — force in grams
//   [4..7] uint32 — device uptime in ms
function parseForcePacket(data: DataView): ForceReading {
  return {
    forceKg:     data.getUint32(0, true) / 1000,
    timestampMs: data.getUint32(4, true),
    receivedAt:  Date.now(),
  }
}

class BLEService {
  private device:              BluetoothDevice | null                    = null
  private server:              BluetoothRemoteGATTServer | null          = null
  private forceChar:           BluetoothRemoteGATTCharacteristic | null  = null
  private commandChar:         BluetoothRemoteGATTCharacteristic | null  = null

  private readonly forceCallbacks:      Set<ForceCallback>      = new Set()
  private readonly disconnectCallbacks: Set<DisconnectCallback> = new Set()

  get isConnected(): boolean {
    return this.server?.connected ?? false
  }

  async connect(): Promise<void> {
    if (!('bluetooth' in navigator)) {
      throw new Error('Web Bluetooth is not supported. Use Chrome or Edge on desktop.')
    }

    this.device = await navigator.bluetooth.requestDevice({
      filters: [{ name: 'ClimbingTrainer' }],
      optionalServices: [BLE_UUIDS.service],
    })

    this.device.addEventListener('gattserverdisconnected', this.handleDisconnect)

    this.server   = await this.device.gatt!.connect()
    const service = await this.server.getPrimaryService(BLE_UUIDS.service)

    this.forceChar   = await service.getCharacteristic(BLE_UUIDS.forceCharacteristic)
    this.commandChar = await service.getCharacteristic(BLE_UUIDS.commandCharacteristic)

    await this.forceChar.startNotifications()
    this.forceChar.addEventListener('characteristicvaluechanged', this.handleForceData)
  }

  async disconnect(): Promise<void> {
    if (this.forceChar) {
      this.forceChar.removeEventListener('characteristicvaluechanged', this.handleForceData)
      await this.forceChar.stopNotifications().catch(() => undefined)
    }
    this.server?.disconnect()
    this.cleanup()
  }

  async sendCommand(command: DeviceCommand): Promise<void> {
    if (!this.commandChar) throw new Error('Not connected')
    await this.commandChar.writeValue(new Uint8Array([command]))
  }

  onForceReading(cb: ForceCallback): () => void {
    this.forceCallbacks.add(cb)
    return () => this.forceCallbacks.delete(cb)
  }

  onDisconnect(cb: DisconnectCallback): () => void {
    this.disconnectCallbacks.add(cb)
    return () => this.disconnectCallbacks.delete(cb)
  }

  private handleForceData = (event: Event): void => {
    const char = event.target as BluetoothRemoteGATTCharacteristic
    if (!char.value) return
    const reading = parseForcePacket(char.value)
    this.forceCallbacks.forEach(cb => cb(reading))
  }

  private handleDisconnect = (): void => {
    this.cleanup()
    this.disconnectCallbacks.forEach(cb => cb())
  }

  private cleanup(): void {
    this.forceChar   = null
    this.commandChar = null
    this.server      = null
    this.device      = null
  }
}

export const bleService = new BLEService()
