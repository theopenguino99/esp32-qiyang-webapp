import { useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// BLE Service UUIDs - these match what your ESP32 is advertising
// NUS = Nordic UART Service (standard Bluetooth protocol for serial-like communication)
const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const NUS_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'  // ESP32 sends data here

export default function App() {
  // State: stores all force readings received from ESP32
  // Format: { time: number, force: number }[]
  // Example: [{ time: 0, force: 5.2 }, { time: 1, force: 5.3 }, ...]
  const [readings, setReadings] = useState<{ time: number; force: number }[]>([])

  // State: true when connected to ESP32, false when disconnected
  const [connected, setConnected] = useState(false)

  // State: status message shown to user ("Disconnected", "Connecting...", "Connected", or error message)
  const [status, setStatus] = useState('Disconnected')

  // State: reference to the BLE device object (needed to disconnect later)
  const [device, setDevice] = useState<BluetoothDevice | null>(null)

  // Function: Connect to ESP32 via Bluetooth
  const connect = useCallback(async () => {
    try {
      setStatus('Connecting...')

      // Step 1: Ask the browser to show Bluetooth device picker
      // Allow for all devices
      const dev = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [NUS_SERVICE],
      })

      // Step 2: Connect to the device's GATT server (generic attribute profile)
      // Think of GATT as a hierarchical address book: Device → Service → Characteristic
      const server = await dev.gatt!.connect()

      // Step 3: Get the NUS Service from the device
      const service = await server.getPrimaryService(NUS_SERVICE)

      // Step 4: Get the TX Characteristic (the pipe through which ESP32 sends data)
      const txChar = await service.getCharacteristic(NUS_TX_CHAR)

      // Step 5: Listen for device disconnection and update state
      dev.addEventListener('gattserverdisconnected', () => {
        setConnected(false)
        setStatus('Disconnected')
      })

      // Step 6: Enable notifications (tell the device we want to be notified when data arrives)
      try {
        await txChar.startNotifications()
      } catch (notifErr) {
        setStatus(`Notification error: ${notifErr instanceof Error ? notifErr.message : 'unknown'}`)
        return
      }

      // Step 7: Listen for incoming data notifications
      txChar.addEventListener('characteristicvaluechanged', (e) => {
        const char = e.target as BluetoothRemoteGATTCharacteristic
        if (!char.value) return

        // Convert the raw bytes into text (e.g., "12.34 kg")
        const text = new TextDecoder().decode(char.value).trim()
        console.log('Received:', text)

        // Parse the text using regex to extract the number
        // Pattern: /([\d.]+)\s*kg/ matches "12.34 kg" or "12.34kg"
        const match = text.match(/([\d.]+)\s*kg/)
        if (match) {
          // Extract the force value (first capture group in the regex)
          const force = parseFloat(match[1])

          // Add this reading to our array and keep only the last 2400 readings
          // (2400 readings at 80Hz = ~30 seconds of data)
          setReadings((prev) => {
            const updated = [...prev, { time: prev.length, force }]
            return updated.slice(-2400)
          })
        }
      })

      // Step 8: Update UI to show we're connected
      setDevice(dev)
      setConnected(true)
      setStatus('Connected')
      setReadings([])  // Clear old data, start fresh

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed'
      setStatus(msg)
      console.error('BLE Error:', err)  // Show error in browser console for debugging
    }
  }, [])

  // Function: Disconnect from ESP32
  const disconnect = useCallback(async () => {
    if (device) {
      device.gatt!.disconnect()
      setConnected(false)
      setStatus('Disconnected')
      setReadings([])
    }
  }, [device])

  // Calculate max and average force from all current readings
  const maxForce = readings.length > 0 ? Math.max(...readings.map(r => r.force)) : 0
  const avgForce = readings.length > 0 ? readings.reduce((s, r) => s + r.force, 0) / readings.length : 0

  // ========== RENDER (what you see on screen) ==========
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Title */}
        <h1 className="text-3xl font-bold">ESP32 Force Monitor</h1>

        {/* Buttons and status */}
        <div className="flex gap-2">
          {/* Connect button - disabled if already connected */}
          <button
            onClick={connect}
            disabled={connected}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
          >
            Connect
          </button>

          {/* Disconnect button - disabled if not connected */}
          <button
            onClick={disconnect}
            disabled={!connected}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded"
          >
            Disconnect
          </button>

          {/* Status display - green if connected, gray if not */}
          <span className={`py-2 px-4 rounded ${connected ? 'bg-green-600' : 'bg-gray-600'}`}>
            {status}
          </span>
        </div>

        {/* Stats boxes - only show when connected */}
        {connected && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            {/* Current force reading */}
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-gray-400">Current</div>
              <div className="text-2xl font-bold">
                {readings.length > 0 ? readings[readings.length - 1].force.toFixed(2) : '0.00'} kg
              </div>
            </div>

            {/* Maximum force seen */}
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-gray-400">Max</div>
              <div className="text-2xl font-bold text-orange-400">{maxForce.toFixed(2)} kg</div>
            </div>

            {/* Average force */}
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-gray-400">Average</div>
              <div className="text-2xl font-bold text-blue-400">{avgForce.toFixed(2)} kg</div>
            </div>
          </div>
        )}

        {/* Chart - only show when connected and we have data */}
        {connected && readings.length > 0 && (
          <div className="bg-slate-800 p-4 rounded">
            {/* Recharts LineChart component renders the data as a line graph */}
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={readings}>
                {/* Background grid */}
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />

                {/* X-axis (time) - hidden because we just use index */}
                <XAxis dataKey="time" hide />

                {/* Y-axis (force in kg) */}
                <YAxis stroke="#94a3b8" domain={[0, 'dataMax + 1']} />

                {/* Tooltip - shows value when you hover */}
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />

                {/* The actual line showing force over time */}
                <Line type="monotone" dataKey="force" stroke="#3b82f6" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Loading message - show when connected but no data yet */}
        {connected && readings.length === 0 && (
          <div className="text-center text-gray-400 py-12">Waiting for data...</div>
        )}
      </div>
    </div>
  )
}
