import type { DeviceStatus } from '../types/ble'

interface Props {
  status:       DeviceStatus
  error:        string | null
  onConnect:    () => void
  onDisconnect: () => void
  onTare:       () => void
}

const DOT: Record<DeviceStatus, string> = {
  disconnected: 'bg-gray-500',
  connecting:   'bg-yellow-400 animate-pulse',
  connected:    'bg-green-400',
  error:        'bg-red-500',
}

const LABEL: Record<DeviceStatus, string> = {
  disconnected: 'Disconnected',
  connecting:   'Connecting…',
  connected:    'Connected',
  error:        'Connection error',
}

export function ConnectionPanel({ status, error, onConnect, onDisconnect, onTare }: Props) {
  const connected  = status === 'connected'
  const connecting = status === 'connecting'

  return (
    <div className="bg-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${DOT[status]}`} />
        <span className="text-sm font-medium">{LABEL[status]}</span>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <div className="flex gap-2">
        {!connected ? (
          <button
            onClick={onConnect}
            disabled={connecting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {connecting ? 'Connecting…' : 'Connect device'}
          </button>
        ) : (
          <>
            <button
              onClick={onTare}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Tare
            </button>
            <button
              onClick={onDisconnect}
              className="flex-1 bg-red-700 hover:bg-red-800 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  )
}
