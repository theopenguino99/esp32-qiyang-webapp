import { createContext, useContext, type ReactNode } from 'react'
import { useBLE, type ForceReading, type CalibrationData } from '../hooks/useBLE'

interface BleContextType {
  readings: ForceReading[]
  connected: boolean
  status: string
  device: BluetoothDevice | null
  latestForce: number
  latestRawForce: number
  calibration: CalibrationData
  connect: () => Promise<void>
  disconnect: () => Promise<void>
  resetReadings: () => void
  updateCalibration: (cal: CalibrationData) => void
  resetCalibration: () => void
}

const BleContext = createContext<BleContextType | null>(null)

export function BleProvider({ children }: { children: ReactNode }) {
  const ble = useBLE()
  return <BleContext.Provider value={ble}>{children}</BleContext.Provider>
}

export function useBleContext() {
  const ctx = useContext(BleContext)
  if (!ctx) throw new Error('useBleContext must be used within BleProvider')
  return ctx
}
