import { useState } from 'react'
import { useBleContext } from '../context/BleContext'
import { useAuthContext } from '../context/AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'
import AuthModal from './AuthModal'

export default function BleStatusBar() {
  const { connected, status, latestForce, samplingRate, connect, disconnect } = useBleContext()
  const { user, signOut } = useAuthContext()
  const [showAuth, setShowAuth] = useState(false)

  return (
    <>
      <div className="ble-status-bar">
        <div className="ble-status-left">
          <span className={`ble-dot ${connected ? 'ble-dot--connected' : 'ble-dot--disconnected'}`} />
          <span className="ble-status-text">{status}</span>
        </div>

        {connected && (
          <div className="ble-force-badges" style={{ display: 'flex', gap: '10px' }}>
            <div className="ble-force-badge">
              <span className="ble-force-value">{latestForce.toFixed(2)}</span>
              <span className="ble-force-unit">kg</span>
            </div>
            <div className="ble-force-badge" title="Sampling Rate">
              <span className="ble-force-value" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>{samplingRate}</span>
              <span className="ble-force-unit">Hz</span>
            </div>
          </div>
        )}

        <div className="ble-status-right">
          {/* Auth button */}
          {isSupabaseConfigured() && (
            user ? (
              <button onClick={signOut} className="ble-btn ble-btn--user" title={user.email}>
                👤
              </button>
            ) : (
              <button onClick={() => setShowAuth(true)} className="ble-btn ble-btn--connect" style={{ padding: '6px 10px' }}>
                Sign In
              </button>
            )
          )}

          {/* BLE buttons */}
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

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  )
}
