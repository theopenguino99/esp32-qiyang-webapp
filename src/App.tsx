import { useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'
const NUS_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'

export default function App() {
  const [readings, setReadings] = useState<{ time: number; force: number }[]>([])
  const [connected, setConnected] = useState(false)
  const [status, setStatus] = useState('Disconnected')
  const [device, setDevice] = useState<BluetoothDevice | null>(null)

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
      })

      try {
        await txChar.startNotifications()
      } catch (notifErr) {
        setStatus(`Notification error: ${notifErr instanceof Error ? notifErr.message : 'unknown'}`)
        return
      }

      txChar.addEventListener('characteristicvaluechanged', (e) => {
        const char = e.target as BluetoothRemoteGATTCharacteristic
        if (!char.value) return
        const text = new TextDecoder().decode(char.value).trim()
        console.log('Received:', text)
        const match = text.match(/([\d.]+)\s*kg/)
        if (match) {
          const force = parseFloat(match[1])
          setReadings((prev) => {
            const updated = [...prev, { time: prev.length, force }]
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
    }
  }, [device])

  const maxForce = readings.length > 0 ? Math.max(...readings.map(r => r.force)) : 0
  const avgForce = readings.length > 0 ? readings.reduce((s, r) => s + r.force, 0) / readings.length : 0

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <h1 className="text-3xl font-bold">ESP32 Force Monitor</h1>

        <div className="flex gap-2">
          <button
            onClick={connect}
            disabled={connected}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded"
          >
            Connect
          </button>
          <button
            onClick={disconnect}
            disabled={!connected}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded"
          >
            Disconnect
          </button>
          <span className={`py-2 px-4 rounded ${connected ? 'bg-green-600' : 'bg-gray-600'}`}>
            {status}
          </span>
        </div>

        {connected && (
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-gray-400">Current</div>
              <div className="text-2xl font-bold">
                {readings.length > 0 ? readings[readings.length - 1].force.toFixed(2) : '0.00'} kg
              </div>
            </div>
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-gray-400">Max</div>
              <div className="text-2xl font-bold text-orange-400">{maxForce.toFixed(2)} kg</div>
            </div>
            <div className="bg-slate-800 p-3 rounded">
              <div className="text-gray-400">Average</div>
              <div className="text-2xl font-bold text-blue-400">{avgForce.toFixed(2)} kg</div>
            </div>
          </div>
        )}

        {connected && readings.length > 0 && (
          <div className="bg-slate-800 p-4 rounded">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={readings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" hide />
                <YAxis stroke="#94a3b8" domain={[0, 'dataMax + 1']} />
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }} />
                <Line type="monotone" dataKey="force" stroke="#3b82f6" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {connected && readings.length === 0 && (
          <div className="text-center text-gray-400 py-12">Waiting for data...</div>
        )}
      </div>
    </div>
  )
}
