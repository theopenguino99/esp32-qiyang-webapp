import { useState, useEffect, useCallback } from 'react'
import { bleService } from '../services/bleService'
import { DeviceCommand, type DeviceStatus, type ForceReading } from '../types/ble'

const WINDOW_MS = 30_000 // keep 30 s of readings in state

export function useBLE() {
  const [status,   setStatus]   = useState<DeviceStatus>('disconnected')
  const [readings, setReadings] = useState<ForceReading[]>([])
  const [maxForce, setMaxForce] = useState(0)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => {
    const unsubForce = bleService.onForceReading(reading => {
      setReadings(prev => {
        const cutoff = reading.receivedAt - WINDOW_MS
        return [...prev.filter(r => r.receivedAt > cutoff), reading]
      })
      setMaxForce(prev => Math.max(prev, reading.forceKg))
    })

    const unsubDisconnect = bleService.onDisconnect(() => {
      setStatus('disconnected')
    })

    return () => {
      unsubForce()
      unsubDisconnect()
    }
  }, [])

  const connect = useCallback(async () => {
    setStatus('connecting')
    setError(null)
    try {
      await bleService.connect()
      setStatus('connected')
      setReadings([])
      setMaxForce(0)
    } catch (err) {
      // DOMException NotFoundError means the user cancelled the picker — not an error
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        setStatus('disconnected')
      } else {
        setStatus('error')
        setError(err instanceof Error ? err.message : 'Connection failed')
      }
    }
  }, [])

  const disconnect = useCallback(async () => {
    await bleService.disconnect()
    setStatus('disconnected')
  }, [])

  const tare = useCallback(async () => {
    await bleService.sendCommand(DeviceCommand.TARE)
  }, [])

  const resetSession = useCallback(() => {
    setReadings([])
    setMaxForce(0)
  }, [])

  return {
    status,
    readings,
    maxForce,
    error,
    connect,
    disconnect,
    tare,
    resetSession,
    isConnected: status === 'connected',
  }
}
