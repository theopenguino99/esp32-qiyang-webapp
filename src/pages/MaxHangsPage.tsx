import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useBleContext } from '../context/BleContext'
import { useAuthContext } from '../context/AuthContext'
import { saveSession } from '../lib/sessionSaver'
import { playWorkBeep, playRestBeep, playDoneBeep, playCountdownBeep } from '../utils/audio'

type Phase = 'config' | 'getReady' | 'work' | 'rest' | 'done'

interface MaxHangsConfig {
  hangTime: number
  restTime: number
  numberOfHangs: number
  targetForce: number
}

interface HangResult {
  hangNumber: number
  peakForce: number
  avgForce: number
}

const DEFAULT_CONFIG: MaxHangsConfig = {
  hangTime: 10,
  restTime: 180,
  numberOfHangs: 5,
  targetForce: 0,
}

export default function MaxHangsPage() {
  const navigate = useNavigate()
  const { connected, latestForce, resetReadings } = useBleContext()
  const { user } = useAuthContext()

  const [config, setConfig] = useState<MaxHangsConfig>(DEFAULT_CONFIG)
  const [phase, setPhase] = useState<Phase>('config')
  const [timeLeft, setTimeLeft] = useState(0)
  const [currentHang, setCurrentHang] = useState(1)
  const [hangReadings, setHangReadings] = useState<{ time: number; force: number }[]>([])
  const [allReadings, setAllReadings] = useState<{ time: number; force: number }[]>([])
  const [results, setResults] = useState<HangResult[]>([])

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef(0)

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const startCountdown = useCallback((duration: number, onComplete: () => void) => {
    setTimeLeft(duration)
    startTimeRef.current = Date.now()
    clearTimer()
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const remaining = Math.max(0, duration - elapsed)
      setTimeLeft(remaining)
      if (Math.ceil(remaining) !== Math.ceil(remaining + 0.1) && remaining <= 3 && remaining > 0) {
        playCountdownBeep()
      }
      if (remaining <= 0) { clearTimer(); onComplete() }
    }, 50)
  }, [clearTimer])

  // Track force during work
  useEffect(() => {
    if (phase === 'work') {
      setHangReadings(prev => [...prev, { time: prev.length, force: latestForce }])
      setAllReadings(prev => [...prev, { time: prev.length, force: latestForce }])
    }
  }, [latestForce, phase])

  const currentHangRef = useRef(currentHang)
  useEffect(() => { currentHangRef.current = currentHang }, [currentHang])
  const hangReadingsRef = useRef(hangReadings)
  useEffect(() => { hangReadingsRef.current = hangReadings }, [hangReadings])

  const finishHang = useCallback(() => {
    const forces = hangReadingsRef.current.map(r => r.force)
    setResults(prev => [...prev, {
      hangNumber: currentHangRef.current,
      peakForce: forces.length > 0 ? Math.max(...forces) : 0,
      avgForce: forces.length > 0 ? forces.reduce((a, b) => a + b, 0) / forces.length : 0,
    }])
    setHangReadings([])

    if (currentHangRef.current >= config.numberOfHangs) {
      clearTimer()
      playDoneBeep()
      setPhase('done')
      return
    }

    playRestBeep()
    setPhase('rest')
    startCountdown(config.restTime, () => {
      setCurrentHang(prev => prev + 1)
      playWorkBeep()
      setPhase('work')
      startCountdown(config.hangTime, finishHang)
    })
  }, [config, clearTimer, startCountdown])

  const startProtocol = useCallback(() => {
    resetReadings()
    setHangReadings([])
    setAllReadings([])
    setResults([])
    setCurrentHang(1)
    setPhase('getReady')
    startCountdown(5, () => {
      playWorkBeep()
      setPhase('work')
      startCountdown(config.hangTime, finishHang)
    })
  }, [config, startCountdown, resetReadings, finishHang])

  const stopProtocol = useCallback(() => {
    clearTimer()
    setPhase('config')
    setHangReadings([])
    setAllReadings([])
  }, [clearTimer])

  useEffect(() => () => clearTimer(), [clearTimer])

  // Auto-save session on completion
  useEffect(() => {
    if (phase === 'done' && results.length > 0) {
      saveSession(user, {
        protocol_type: 'max-hangs', protocol_name: 'Max Hangs',
        peak_force: Math.max(...results.map(r => r.peakForce)),
        avg_force: results.reduce((a, r) => a + r.avgForce, 0) / results.length,
        sets_data: results, config,
      })
    }
  }, [phase])

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = Math.floor(s % 60)
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
  }

  const phaseColors: Record<Phase, string> = {
    config: '', getReady: 'phase--getready', work: 'phase--work', rest: 'phase--rest', done: 'phase--done',
  }

  const chartData = allReadings.slice(-400)

  return (
    <div className={`page-container repeaters-page ${phaseColors[phase]}`}>
      <div className="page-header">
        <button className="back-btn" onClick={() => { stopProtocol(); navigate('/training') }}>← Back</button>
        <div>
          <h1 className="page-title">💪 Max Hangs</h1>
          <p className="page-subtitle">Heavy load, long rest — pure max strength</p>
        </div>
      </div>

      {phase === 'config' && (
        <div className="repeaters-config">
          <div className="config-section">
            <h2 className="config-section-title">Protocol Settings</h2>
            <div className="config-grid">
              <div className="config-field">
                <label>Hang Time</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({...c, hangTime: Math.max(3, c.hangTime - 1)}))} className="config-btn">−</button>
                  <span className="config-value">{config.hangTime}s</span>
                  <button onClick={() => setConfig(c => ({...c, hangTime: c.hangTime + 1}))} className="config-btn">+</button>
                </div>
              </div>
              <div className="config-field">
                <label>Rest Time</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({...c, restTime: Math.max(30, c.restTime - 30)}))} className="config-btn">−</button>
                  <span className="config-value">{formatTime(config.restTime)}</span>
                  <button onClick={() => setConfig(c => ({...c, restTime: c.restTime + 30}))} className="config-btn">+</button>
                </div>
              </div>
              <div className="config-field">
                <label>Hangs</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({...c, numberOfHangs: Math.max(1, c.numberOfHangs - 1)}))} className="config-btn">−</button>
                  <span className="config-value">{config.numberOfHangs}</span>
                  <button onClick={() => setConfig(c => ({...c, numberOfHangs: c.numberOfHangs + 1}))} className="config-btn">+</button>
                </div>
              </div>
              <div className="config-field">
                <label>Target Force</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({...c, targetForce: Math.max(0, +(c.targetForce - 1).toFixed(1))}))} className="config-btn">−</button>
                  <span className="config-value">{config.targetForce > 0 ? `${config.targetForce} kg` : 'Off'}</span>
                  <button onClick={() => setConfig(c => ({...c, targetForce: +(c.targetForce + 1).toFixed(1)}))} className="config-btn">+</button>
                </div>
              </div>
            </div>
          </div>
          <button className="btn btn--start" onClick={startProtocol} disabled={!connected}>
            {connected ? 'Start Max Hangs' : 'Connect Sensor to Start'}
          </button>
        </div>
      )}

      {(phase === 'getReady' || phase === 'work' || phase === 'rest') && (
        <div className="repeaters-active">
          <div className={`phase-banner ${phaseColors[phase]}`}>
            <span className="phase-label">
              {phase === 'getReady' ? 'GET READY' : phase === 'work' ? 'HANG!' : 'REST'}
            </span>
          </div>
          <div className="timer-container">
            <svg className="timer-ring" viewBox="0 0 120 120">
              <circle className="timer-ring-bg" cx="60" cy="60" r="54" fill="none" strokeWidth="6" />
              <circle className="timer-ring-progress" cx="60" cy="60" r="54" fill="none" strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={2 * Math.PI * 54 * (1 - timeLeft / (phase === 'getReady' ? 5 : phase === 'work' ? config.hangTime : config.restTime))}
                strokeLinecap="round" />
            </svg>
            <div className="timer-text">{Math.ceil(timeLeft)}</div>
          </div>
          <div className="counters">
            <div className="counter">
              <span className="counter-label">Hang</span>
              <span className="counter-value">{currentHang}/{config.numberOfHangs}</span>
            </div>
          </div>
          <div className="live-force">
            <span className="live-force-value">{latestForce.toFixed(1)}</span>
            <span className="live-force-unit">kg</span>
          </div>
          {chartData.length > 2 && (
            <div className="repeaters-chart">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" hide />
                  <YAxis stroke="#64748b" domain={[0, 'auto']} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }} labelStyle={{ display: 'none' }} />
                  {config.targetForce > 0 && <ReferenceLine y={config.targetForce} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={2} />}
                  <Line type="monotone" dataKey="force" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <button className="btn btn--stop" onClick={stopProtocol}>Stop Protocol</button>
        </div>
      )}

      {phase === 'done' && (
        <div className="repeaters-summary">
          <div className="summary-header">
            <div className="summary-checkmark">✓</div>
            <h2>Max Hangs Complete!</h2>
          </div>
          <div className="summary-stats">
            {results.map(r => (
              <div key={r.hangNumber} className="summary-set-card">
                <h3>Hang {r.hangNumber}</h3>
                <div className="summary-set-stats">
                  <div>
                    <span className="stat-label">Avg Force</span>
                    <span className="stat-value">{r.avgForce.toFixed(1)} kg</span>
                  </div>
                  <div>
                    <span className="stat-label">Peak Force</span>
                    <span className="stat-value stat-value--peak">{r.peakForce.toFixed(1)} kg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {results.length > 0 && (
            <div className="summary-totals">
              <div className="summary-total-item">
                <span className="stat-label">Best Peak</span>
                <span className="stat-value stat-value--peak">{Math.max(...results.map(r => r.peakForce)).toFixed(1)} kg</span>
              </div>
              <div className="summary-total-item">
                <span className="stat-label">Avg of Peaks</span>
                <span className="stat-value">{(results.reduce((a, r) => a + r.peakForce, 0) / results.length).toFixed(1)} kg</span>
              </div>
            </div>
          )}
          <div className="summary-actions">
            <button className="btn btn--primary" onClick={() => setPhase('config')}>New Session</button>
            <button className="btn btn--secondary" onClick={() => navigate('/training')}>Back to Training</button>
          </div>
        </div>
      )}
    </div>
  )
}
