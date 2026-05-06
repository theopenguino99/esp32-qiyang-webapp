import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../context/AuthContext'
import { loadHistory, type ExerciseSession } from '../lib/sessionSaver'
import { isSupabaseConfigured } from '../lib/supabase'

const PROTOCOL_ICONS: Record<string, string> = {
  repeaters: '🔄', 'max-hangs': '💪', 'density-hangs': '🧱',
  'mvc-test': '💥', 'critical-force': '🔬', rfd: '⚡',
  'progressive-loading': '📈', submaximal: '🧘', custom: '🛠️',
}

export default function HistoryPage() {
  const navigate = useNavigate()
  const { user } = useAuthContext()
  const [sessions, setSessions] = useState<ExerciseSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadHistory(user).then(data => { setSessions(data); setLoading(false) })
  }, [user])

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  if (!isSupabaseConfigured()) return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div><h1 className="page-title">📜 History</h1><p className="page-subtitle">Your exercise sessions</p></div>
      </div>
      <div className="coming-soon-container">
        <div className="coming-soon-icon">☁️</div>
        <h2 className="coming-soon-title">Cloud Not Configured</h2>
        <p className="coming-soon-text">Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file to enable exercise history.</p>
      </div>
    </div>
  )

  if (!user) return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div><h1 className="page-title">📜 History</h1><p className="page-subtitle">Your exercise sessions</p></div>
      </div>
      <div className="coming-soon-container">
        <div className="coming-soon-icon">🔒</div>
        <h2 className="coming-soon-title">Sign In Required</h2>
        <p className="coming-soon-text">Sign in using the button in the bottom bar to view and save your exercise history.</p>
      </div>
    </div>
  )

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>← Back</button>
        <div><h1 className="page-title">📜 History</h1><p className="page-subtitle">Your exercise sessions</p></div>
      </div>

      {loading ? (
        <div className="coming-soon-container" style={{ padding: '40px 20px' }}>
          <p className="coming-soon-text">Loading...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="coming-soon-container" style={{ padding: '40px 20px' }}>
          <div className="coming-soon-icon">📝</div>
          <h2 className="coming-soon-title">No Sessions Yet</h2>
          <p className="coming-soon-text">Complete a training, testing, or rehab protocol to start building your history.</p>
        </div>
      ) : (
        <div className="history-list">
          {sessions.map(s => (
            <div key={s.id} className="history-card">
              <div className="history-card-icon">{PROTOCOL_ICONS[s.protocol_type] || '📋'}</div>
              <div className="history-card-content">
                <h3 className="history-card-title">{s.protocol_name}</h3>
                <p className="history-card-date">{formatDate(s.completed_at)}</p>
                <div className="history-card-stats">
                  {s.peak_force != null && <span className="history-stat">Peak: <strong>{s.peak_force.toFixed(1)} kg</strong></span>}
                  {s.avg_force != null && <span className="history-stat">Avg: <strong>{s.avg_force.toFixed(1)} kg</strong></span>}
                  {s.duration_s != null && <span className="history-stat">{Math.floor(s.duration_s / 60)}:{(s.duration_s % 60).toString().padStart(2, '0')}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
