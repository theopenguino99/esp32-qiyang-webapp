import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { useBleContext } from '../context/BleContext'
import { playWorkBeep, playDoneBeep, playCountdownBeep } from '../utils/audio'

type Phase = 'idle' | 'countdown' | 'testing' | 'done'

export default function RfdTestPage() {
  const navigate = useNavigate()
  const { connected, latestForce } = useBleContext()
  const [phase, setPhase] = useState<Phase>('idle')
  const [countdown, setCountdown] = useState(3)
  const [timeLeft, setTimeLeft] = useState(3)
  const [peak, setPeak] = useState(0)
  const [rfd, setRfd] = useState(0) // kg/s
  const [readings, setReadings] = useState<{time:number;force:number}[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const testStartRef = useRef(0)

  const clear = () => { if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null} }

  useEffect(() => {
    if (phase === 'testing') {
      const t = (Date.now() - testStartRef.current) / 1000
      setReadings(prev => [...prev, { time: Math.round(t * 100) / 100, force: latestForce }])
      if (latestForce > peak) setPeak(latestForce)
    }
  }, [latestForce, phase, peak])

  const startTest = () => {
    setPeak(0); setRfd(0); setReadings([]); setCountdown(3); setPhase('countdown')
    let c = 3
    timerRef.current = setInterval(() => {
      c--; setCountdown(c); playCountdownBeep()
      if (c <= 0) {
        clear(); setPhase('testing'); playWorkBeep(); setTimeLeft(3)
        testStartRef.current = Date.now()
        const start = Date.now()
        timerRef.current = setInterval(() => {
          const r = Math.max(0, 3 - (Date.now()-start)/1000); setTimeLeft(r)
          if (r <= 0) { clear(); setPhase('done'); playDoneBeep() }
        }, 50)
      }
    }, 1000)
  }

  // Calculate RFD when test completes
  useEffect(() => {
    if (phase === 'done' && readings.length > 5) {
      // RFD = peak force / time to reach peak
      const peakIdx = readings.reduce((best, r, i) => r.force > readings[best].force ? i : best, 0)
      const timeToPeak = readings[peakIdx].time
      if (timeToPeak > 0) setRfd(readings[peakIdx].force / timeToPeak)
    }
  }, [phase, readings])

  useEffect(() => () => clear(), [])

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={()=>{clear();navigate('/testing')}}>← Back</button>
        <div><h1 className="page-title">⚡ Rate of Force Development</h1><p className="page-subtitle">Measure how fast you can produce force</p></div>
      </div>

      {phase==='idle'&&(
        <div className="repeaters-config">
          <div className="config-section">
            <h2 className="config-section-title">How it works</h2>
            <p className="config-hint">After the countdown, pull as hard and as FAST as possible for 3 seconds. Start from zero — don't pre-load. RFD = peak force ÷ time to reach peak.</p>
          </div>
          <button className="btn btn--start" onClick={startTest} disabled={!connected}>{connected?'Start RFD Test':'Connect Sensor to Start'}</button>
        </div>
      )}

      {phase==='countdown'&&(
        <div className="repeaters-active">
          <div className="phase-banner phase--getready"><span className="phase-label">GET READY — DON'T PRE-LOAD</span></div>
          <div className="mvc-countdown">{countdown}</div>
        </div>
      )}

      {phase==='testing'&&(
        <div className="repeaters-active">
          <div className="phase-banner phase--work"><span className="phase-label">PULL FAST!</span></div>
          <div className="timer-container">
            <svg className="timer-ring" viewBox="0 0 120 120"><circle className="timer-ring-bg" cx="60" cy="60" r="54" fill="none" strokeWidth="6"/><circle className="timer-ring-progress" cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeDasharray={`${2*Math.PI*54}`} strokeDashoffset={2*Math.PI*54*(1-timeLeft/3)} strokeLinecap="round"/></svg>
            <div className="timer-text">{Math.ceil(timeLeft)}</div>
          </div>
          <div className="live-force"><span className="live-force-value">{latestForce.toFixed(1)}</span><span className="live-force-unit">kg</span></div>
        </div>
      )}

      {phase==='done'&&(
        <div className="repeaters-summary">
          <div className="summary-header"><div className="summary-checkmark">✓</div><h2>RFD Test Complete</h2></div>
          <div className="summary-totals">
            <div className="summary-total-item"><span className="stat-label">Peak Force</span><span className="stat-value stat-value--peak">{peak.toFixed(1)} kg</span></div>
            <div className="summary-total-item"><span className="stat-label">RFD</span><span className="stat-value">{rfd.toFixed(1)} kg/s</span></div>
          </div>
          {readings.length>2&&(
            <div className="repeaters-chart" style={{width:'100%'}}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={readings}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="time" stroke="#64748b" unit="s"/><YAxis stroke="#64748b" domain={[0,'auto']}/><Line type="monotone" dataKey="force" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2}/></LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="summary-actions"><button className="btn btn--primary" onClick={()=>setPhase('idle')}>Test Again</button><button className="btn btn--secondary" onClick={()=>navigate('/testing')}>Back to Testing</button></div>
        </div>
      )}
    </div>
  )
}
