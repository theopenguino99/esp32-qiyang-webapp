import { useState, useCallback, useRef } from 'react'

const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const NUS_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'

export interface ForceReading {
  time: number
  force: number
}

export function useBLE() {
  const [readings, setReadings] = useState<ForceReading[]>([])
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('Disconnected')
  const [device, setDevice] = useState<BluetoothDevice | null>(null)
  const [latestForce, setLatestForce] = useState(0)
  const startTimeRef = useRef<number>(0)

  const connect = useCallback(async () => {
    try {
      setStatus('Connecting...')
      const dev = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'ESP32-C6' }],
        optionalServices: [NUS_SERVICE],
      })

      const server = await dev.gatt!.connect()
      const service = await server.getPrimaryService(NUS_SERVICE)
      const txChar = await service.getCharacteristic(NUS_TX_CHAR)

      dev.addEventListener('gattserverdisconnected', () => {
        setConnected(false)
        setStatus('Disconnected')
        setLatestForce(0)
      })

      try {
        await txChar.startNotifications()
      } catch (notifErr) {
        setStatus(`Notification error: ${notifErr instanceof Error ? notifErr.message : 'unknown'}`)
        return
      }

      startTimeRef.current = Date.now()

      txChar.addEventListener('characteristicvaluechanged', (e) => {
        const char = e.target as BluetoothRemoteGATTCharacteristic
        if (!char.value) return
        const text = new TextDecoder().decode(char.value).trim()
        const match = text.match(/([\d.]+)\s*kg/)
        if (match) {
          const force = parseFloat(match[1])
          setLatestForce(force)
          const elapsed = (Date.now() - startTimeRef.current) / 1000
          setReadings((prev) => {
            const updated = [...prev, { time: elapsed, force }]
            return updated.slice(-2400) // keep last 30s at 80Hz
          })
        }
      })

      setDevice(dev)
      setConnected(true)
      setStatus('Connected')
      setReadings([])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setStatus(msg)
      console.error('BLE Error:', err)
    }
  }, [])

  const disconnect = useCallback(async () => {
    if (device) {
      device.gatt!.disconnect()
      setConnected(false)
      setStatus('Disconnected')
      setReadings([])
      setLatestForce(0)
    }
  }, [device])

  const resetReadings = useCallback(() => {
    setReadings([])
    startTimeRef.current = Date.now()
  }, [])

  return {
    readings,
    connected,
    status,
    device,
    latestForce,
    connect,
    disconnect,
    resetReadings,
  }
}
