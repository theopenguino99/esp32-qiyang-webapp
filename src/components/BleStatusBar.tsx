import { useBleContext } from '../context/BleContext'

export default function BleStatusBar() {
  const { connected, status, latestForce, connect, disconnect } = useBleContext()

  return (
    <div className="ble-status-bar">
      <div className="ble-status-left">
        <span className={`ble-dot ${connected ? 'ble-dot--connected' : 'ble-dot--disconnected'}`} />
        <span className="ble-status-text">{status}</span>
      </div>

      {connected && (
        <div className="ble-force-badge">
          <span className="ble-force-value">{latestForce.toFixed(1)}</span>
          <span className="ble-force-unit">kg</span>
        </div>
      )}

      <div className="ble-status-right">
        {!connected ? (
          <button onClick={connect} className="ble-btn ble-btn--connect">
            Connect
          </button>
        ) : (
          <button onClick={disconnect} className="ble-btn ble-btn--disconnect">
            Disconnect
          </button>
        )}
      </div>
    </div>
  )
}
