import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useBleContext } from '../context/BleContext'
import { playWorkBeep, playRestBeep, playDoneBeep, playCountdownBeep } from '../utils/audio'

type Phase = 'config' | 'getReady' | 'work' | 'rest' | 'done'

interface DensityConfig {
  hangTime: number
  restTime: number
  totalSets: number
}

const DEFAULT: DensityConfig = { hangTime: 7, restTime: 3, totalSets: 30 }

export default function DensityHangsPage() {
  const navigate = useNavigate()
  const { connected, latestForce, resetReadings } = useBleContext()
  const [config, setConfig] = useState<DensityConfig>(DEFAULT)
  const [phase, setPhase] = useState<Phase>('config')
  const [timeLeft, setTimeLeft] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const [buf, setBuf] = useState<{time:number;force:number}[]>([])
  const [results, setResults] = useState<{set:number;avg:number;peak:number}[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const startRef = useRef(0)
  const setRef = useRef(1)
  const bufRef = useRef(buf)
  useEffect(()=>{setRef.current=currentSet},[currentSet])
  useEffect(()=>{bufRef.current=buf},[buf])

  const clear = useCallback(()=>{if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null}},[])
  const countdown = useCallback((dur:number,cb:()=>void)=>{
    setTimeLeft(dur); startRef.current=Date.now(); clear()
    timerRef.current=setInterval(()=>{
      const r=Math.max(0,dur-(Date.now()-startRef.current)/1000); setTimeLeft(r)
      if(Math.ceil(r)!==Math.ceil(r+0.1)&&r<=3&&r>0) playCountdownBeep()
      if(r<=0){clear();cb()}
    },50)
  },[clear])

  useEffect(()=>{if(phase==='work') setBuf(p=>[...p,{time:p.length,force:latestForce}])},[latestForce,phase])

  const finishSet = useCallback(()=>{
    const f=bufRef.current.map(r=>r.force)
    setResults(p=>[...p,{set:setRef.current, avg:f.length?f.reduce((a,b)=>a+b,0)/f.length:0, peak:f.length?Math.max(...f):0}])
    setBuf([])
    if(setRef.current>=config.totalSets){clear();playDoneBeep();setPhase('done');return}
    playRestBeep();setPhase('rest')
    countdown(config.restTime,()=>{setCurrentSet(p=>p+1);playWorkBeep();setPhase('work');countdown(config.hangTime,finishSet)})
  },[config,clear,countdown])

  const start = useCallback(()=>{
    resetReadings();setBuf([]);setResults([]);setCurrentSet(1);setPhase('getReady')
    countdown(5,()=>{playWorkBeep();setPhase('work');countdown(config.hangTime,finishSet)})
  },[config,countdown,resetReadings,finishSet])
  const stop = useCallback(()=>{clear();setPhase('config');setBuf([])},[clear])
  useEffect(()=>()=>clear(),[clear])

  const pc:Record<Phase,string>={config:'',getReady:'phase--getready',work:'phase--work',rest:'phase--rest',done:'phase--done'}

  return (
    <div className={`page-container repeaters-page ${pc[phase]}`}>
      <div className="page-header">
        <button className="back-btn" onClick={()=>{stop();navigate('/training')}}>← Back</button>
        <div><h1 className="page-title">🧱 Density Hangs</h1><p className="page-subtitle">High volume sub-maximal tendon conditioning</p></div>
      </div>
      {phase==='config'&&(
        <div className="repeaters-config">
          <div className="config-section">
            <h2 className="config-section-title">Protocol Settings</h2>
            <p className="config-hint">Submaximal hangs with short rest — high total time under tension for tendon adaptation.</p>
            <div className="config-grid">
              <div className="config-field"><label>Hang Time</label><div className="config-input-group"><button onClick={()=>setConfig(c=>({...c,hangTime:Math.max(3,c.hangTime-1)}))} className="config-btn">−</button><span className="config-value">{config.hangTime}s</span><button onClick={()=>setConfig(c=>({...c,hangTime:c.hangTime+1}))} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Rest Time</label><div className="config-input-group"><button onClick={()=>setConfig(c=>({...c,restTime:Math.max(1,c.restTime-1)}))} className="config-btn">−</button><span className="config-value">{config.restTime}s</span><button onClick={()=>setConfig(c=>({...c,restTime:c.restTime+1}))} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Total Sets</label><div className="config-input-group"><button onClick={()=>setConfig(c=>({...c,totalSets:Math.max(5,c.totalSets-5)}))} className="config-btn">−</button><span className="config-value">{config.totalSets}</span><button onClick={()=>setConfig(c=>({...c,totalSets:c.totalSets+5}))} className="config-btn">+</button></div></div>
            </div>
          </div>
          <button className="btn btn--start" onClick={start} disabled={!connected}>{connected?'Start Density Hangs':'Connect Sensor to Start'}</button>
        </div>
      )}
      {(phase==='getReady'||phase==='work'||phase==='rest')&&(
        <div className="repeaters-active">
          <div className={`phase-banner ${pc[phase]}`}><span className="phase-label">{phase==='getReady'?'GET READY':phase==='work'?'HANG!':'REST'}</span></div>
          <div className="timer-container">
            <svg className="timer-ring" viewBox="0 0 120 120"><circle className="timer-ring-bg" cx="60" cy="60" r="54" fill="none" strokeWidth="6"/><circle className="timer-ring-progress" cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeDasharray={`${2*Math.PI*54}`} strokeDashoffset={2*Math.PI*54*(1-timeLeft/(phase==='getReady'?5:phase==='work'?config.hangTime:config.restTime))} strokeLinecap="round"/></svg>
            <div className="timer-text">{Math.ceil(timeLeft)}</div>
          </div>
          <div className="counters"><div className="counter"><span className="counter-label">Set</span><span className="counter-value">{currentSet}/{config.totalSets}</span></div></div>
          <div className="live-force"><span className="live-force-value">{latestForce.toFixed(1)}</span><span className="live-force-unit">kg</span></div>
          {buf.length>2&&(<div className="repeaters-chart"><ResponsiveContainer width="100%" height={150}><LineChart data={buf.slice(-200)}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="time" hide/><YAxis stroke="#64748b" domain={[0,'auto']}/><Tooltip contentStyle={{backgroundColor:'#0f172a',border:'1px solid #334155',borderRadius:'8px'}} labelStyle={{display:'none'}}/><Line type="monotone" dataKey="force" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2}/></LineChart></ResponsiveContainer></div>)}
          <button className="btn btn--stop" onClick={stop}>Stop Protocol</button>
        </div>
      )}
      {phase==='done'&&(
        <div className="repeaters-summary">
          <div className="summary-header"><div className="summary-checkmark">✓</div><h2>Density Hangs Complete!</h2></div>
          <div className="summary-totals">
            <div className="summary-total-item"><span className="stat-label">Total Sets</span><span className="stat-value">{results.length}</span></div>
            <div className="summary-total-item"><span className="stat-label">Overall Avg</span><span className="stat-value">{(results.reduce((a,r)=>a+r.avg,0)/results.length).toFixed(1)} kg</span></div>
            <div className="summary-total-item"><span className="stat-label">Session Peak</span><span className="stat-value stat-value--peak">{Math.max(...results.map(r=>r.peak)).toFixed(1)} kg</span></div>
          </div>
          <div className="summary-actions"><button className="btn btn--primary" onClick={()=>setPhase('config')}>New Session</button><button className="btn btn--secondary" onClick={()=>navigate('/training')}>Back to Training</button></div>
        </div>
      )}
    </div>
  )
}
