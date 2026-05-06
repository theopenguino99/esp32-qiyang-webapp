import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useBleContext } from '../context/BleContext'
import { useAuthContext } from '../context/AuthContext'
import { saveSession } from '../lib/sessionSaver'
import { playWorkBeep, playDoneBeep, playCountdownBeep } from '../utils/audio'

type Phase = 'idle' | 'countdown' | 'testing' | 'done'

export default function MvcTestPage() {
  const navigate = useNavigate()
  const { connected, latestForce } = useBleContext()
  const { user } = useAuthContext()
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(5)
  const [peak, setPeak] = useState(0)
  const [readings, setReadings] = useState<{time:number;force:number}[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)

  const clear = () => { if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null} }

  useEffect(() => {
    if (phase === 'testing') {
      setReadings(prev => [...prev, { time: prev.length, force: latestForce }])
      if (latestForce > peak) setPeak(latestForce)
    }
  }, [latestForce, phase, peak])

  const startTest = () => {
    setPeak(0); setReadings([]); setCountdown(3); setPhase('countdown')
    let c = 3
    timerRef.current = setInterval(() => {
      c--; setCountdown(c); playCountdownBeep()
      if (c <= 0) {
        clear(); setPhase('testing'); playWorkBeep(); setTimeLeft(5)
        const start = Date.now()
        timerRef.current = setInterval(() => {
          const r = Math.max(0, 5 - (Date.now()-start)/1000); setTimeLeft(r)
          if (r <= 0) { clear(); setPhase('done'); playDoneBeep() }
        }, 50)
      }
    }, 1000)
  }

  useEffect(() => () => clear(), [])

  useEffect(() => {
    if (phase === 'done' && peak > 0) {
      saveSession(user, {
        protocol_type: 'mvc-test', protocol_name: 'MVC Test',
        peak_force: peak,
        avg_force: readings.length > 0 ? readings.reduce((a, r) => a + r.force, 0) / readings.length : 0,
        duration_s: 5,
      })
    }
  }, [phase])

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={()=>{clear();navigate('/testing')}}>← Back</button>
        <div><h1 className="page-title">💥 MVC Test</h1><p className="page-subtitle">Maximum Voluntary Contraction — 5 second max pull</p></div>
      </div>

      {phase === 'idle' && (
        <div className="repeaters-config">
          <div className="config-section">
            <h2 className="config-section-title">How it works</h2>
            <p className="config-hint">After a 3-second countdown, pull as hard as you can for 5 seconds. Your peak force will be recorded.</p>
          </div>
          <button className="btn btn--start" onClick={startTest} disabled={!connected}>
            {connected ? 'Start MVC Test' : 'Connect Sensor to Start'}
          </button>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="repeaters-active">
          <div className="phase-banner phase--getready"><span className="phase-label">GET READY</span></div>
          <div className="mvc-countdown">{countdown}</div>
        </div>
      )}

      {phase === 'testing' && (
        <div className="repeaters-active">
          <div className="phase-banner phase--work"><span className="phase-label">PULL MAX!</span></div>
          <div className="timer-container">
            <svg className="timer-ring" viewBox="0 0 120 120"><circle className="timer-ring-bg" cx="60" cy="60" r="54" fill="none" strokeWidth="6"/><circle className="timer-ring-progress" cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeDasharray={`${2*Math.PI*54}`} strokeDashoffset={2*Math.PI*54*(1-timeLeft/5)} strokeLinecap="round"/></svg>
            <div className="timer-text">{Math.ceil(timeLeft)}</div>
          </div>
          <div className="live-force"><span className="live-force-value">{latestForce.toFixed(1)}</span><span className="live-force-unit">kg</span></div>
          <div style={{fontSize:'14px',color:'var(--text-muted)'}}>Peak: {peak.toFixed(1)} kg</div>
        </div>
      )}

      {phase === 'done' && (
        <div className="repeaters-summary">
          <div className="summary-header"><div className="summary-checkmark">✓</div><h2>MVC Test Complete</h2></div>
          <div className="summary-totals">
            <div className="summary-total-item"><span className="stat-label">Peak Force (MVC)</span><span className="stat-value stat-value--peak">{peak.toFixed(1)} kg</span></div>
            <div className="summary-total-item"><span className="stat-label">80% MVC</span><span className="stat-value">{(peak*0.8).toFixed(1)} kg</span></div>
          </div>
          {readings.length > 2 && (
            <div className="repeaters-chart" style={{width:'100%'}}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={readings}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="time" hide/><YAxis stroke="#64748b" domain={[0,'auto']}/><Line type="monotone" dataKey="force" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2}/></LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="summary-actions">
            <button className="btn btn--primary" onClick={()=>setPhase('idle')}>Test Again</button>
            <button className="btn btn--secondary" onClick={()=>navigate('/testing')}>Back to Testing</button>
          </div>
        </div>
      )}
    </div>
  )
}
