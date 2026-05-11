import { useState, useCallback, useRef } from 'react'

const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const NUS_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'

const CALIBRATION_KEY = 'crimp-er-calibration'

export interface ForceReading {
  time: number
  force: number
}

export interface CalibrationData {
  offset: number      // raw value when no load applied
  scaleFactor: number  // multiplier to correct raw-to-actual ratio
}

function loadCalibration(): CalibrationData {
  try {
    const saved = localStorage.getItem(CALIBRATION_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return { offset: 0, scaleFactor: 1 }
}

function saveCalibration(cal: CalibrationData) {
  localStorage.setItem(CALIBRATION_KEY, JSON.stringify(cal))
}

export function useBLE() {
  const [readings, setReadings] = useState<ForceReading[]>([])
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('Disconnected')
  const [device, setDevice] = useState<BluetoothDevice | null>(null)
  const [latestForce, setLatestForce] = useState(0)
  const [latestRawForce, setLatestRawForce] = useState(0)
  const [samplingRate, setSamplingRate] = useState(0)
  const [calibration, setCalibration] = useState<CalibrationData>(loadCalibration)
  const startTimeRef = useRef<number>(0)
  const calibrationRef = useRef<CalibrationData>(loadCalibration())
  const readingCountRef = useRef(0)
  const lastRateUpdateRef = useRef(0)
  const lastRawRef = useRef<number | null>(null)

  const applyCalibration = (raw: number): number => {
    const cal = calibrationRef.current
    return Math.max(0, (raw - cal.offset) * cal.scaleFactor)
  }

  const connect = useCallback(async () => {
    try {
      setStatus('Connecting...')
      const dev = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [NUS_SERVICE],
      })

      const server = await dev.gatt!.connect()
      const service = await server.getPrimaryService(NUS_SERVICE)
      const txChar = await service.getCharacteristic(NUS_TX_CHAR)

      dev.addEventListener('gattserverdisconnected', () => {
        setConnected(false)
        setStatus('Disconnected')
        setLatestForce(0)
        setLatestRawForce(0)
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
          readingCountRef.current += 1
          const now = Date.now()
          if (now - lastRateUpdateRef.current >= 1000) {
            if (lastRateUpdateRef.current > 0) {
              setSamplingRate(Math.round((readingCountRef.current * 1000) / (now - lastRateUpdateRef.current)))
            }
            readingCountRef.current = 0
            lastRateUpdateRef.current = now
          }

          const raw = parseFloat(match[1])
          if (lastRawRef.current !== null && raw === lastRawRef.current) return
          lastRawRef.current = raw
          setLatestRawForce(raw)
          const force = Math.round(applyCalibration(raw) * 100) / 100
          setLatestForce(force)
          const elapsed = (Date.now() - startTimeRef.current) / 1000
          setReadings((prev) => {
            const updated = [...prev, { time: elapsed, force }]
            return updated.filter((r) => elapsed - r.time <= 30)
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
      setLatestRawForce(0)
    }
  }, [device])

  const resetReadings = useCallback(() => {
    setReadings([])
    startTimeRef.current = Date.now()
  }, [])

  const updateCalibration = useCallback((cal: CalibrationData) => {
    calibrationRef.current = cal
    setCalibration(cal)
    saveCalibration(cal)
  }, [])

  const resetCalibration = useCallback(() => {
    const defaults: CalibrationData = { offset: 0, scaleFactor: 1 }
    calibrationRef.current = defaults
    setCalibration(defaults)
    saveCalibration(defaults)
  }, [])

  return {
    readings,
    connected,
    status,
    device,
    latestForce,
    latestRawForce,
    samplingRate,
    calibration,
    connect,
    disconnect,
    resetReadings,
    updateCalibration,
    resetCalibration,
  }
}
