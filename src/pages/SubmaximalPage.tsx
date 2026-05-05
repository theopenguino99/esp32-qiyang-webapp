import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBleContext } from '../context/BleContext'
import { playWorkBeep, playRestBeep, playDoneBeep, playCountdownBeep } from '../utils/audio'

type Phase = 'config' | 'getReady' | 'work' | 'rest' | 'done'

export default function SubmaximalPage() {
  const navigate = useNavigate()
  const { connected, latestForce, resetReadings } = useBleContext()
  const [holdTime, setHoldTime] = useState(30)
  const [restTime, setRestTime] = useState(60)
  const [sets, setSets] = useState(5)
  const [targetPct, setTargetPct] = useState(30)
  const [maxForce, setMaxForce] = useState(20)
  const [phase, setPhase] = useState<Phase>('config')
  const [timeLeft, setTimeLeft] = useState(0)
  const [currentSet, setCurrentSet] = useState(1)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const startRef = useRef(0)
  const setRefN = useRef(1); useEffect(()=>{setRefN.current=currentSet},[currentSet])

  const clear = useCallback(()=>{if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null}},[])
  const cd = useCallback((dur:number,cb:()=>void)=>{
    setTimeLeft(dur);startRef.current=Date.now();clear()
    timerRef.current=setInterval(()=>{
      const r=Math.max(0,dur-(Date.now()-startRef.current)/1000);setTimeLeft(r)
      if(Math.ceil(r)!==Math.ceil(r+0.1)&&r<=3&&r>0) playCountdownBeep()
      if(r<=0){clear();cb()}
    },50)
  },[clear])

  const target = Math.round(maxForce * targetPct / 100 * 10) / 10

  const finishSet = useCallback(()=>{
    if(setRefN.current>=sets){clear();playDoneBeep();setPhase('done');return}
    playRestBeep();setPhase('rest')
    cd(restTime,()=>{setCurrentSet(p=>p+1);playWorkBeep();setPhase('work');cd(holdTime,finishSet)})
  },[sets,restTime,holdTime,clear,cd])

  const start = useCallback(()=>{
    resetReadings();setCurrentSet(1);setPhase('getReady')
    cd(5,()=>{playWorkBeep();setPhase('work');cd(holdTime,finishSet)})
  },[holdTime,cd,resetReadings,finishSet])
  const stop = useCallback(()=>{clear();setPhase('config')},[clear])
  useEffect(()=>()=>clear(),[clear])

  const pc:Record<Phase,string>={config:'',getReady:'phase--getready',work:'phase--work',rest:'phase--rest',done:'phase--done'}

  return (
    <div className={`page-container repeaters-page ${pc[phase]}`}>
      <div className="page-header">
        <button className="back-btn" onClick={()=>{stop();navigate('/rehab')}}>← Back</button>
        <div><h1 className="page-title">🧘 Submaximal Isometrics</h1><p className="page-subtitle">Long holds at low intensity for tendon healing</p></div>
      </div>

      {phase==='config'&&(
        <div className="repeaters-config">
          <div className="config-section">
            <h2 className="config-section-title">Protocol Settings</h2>
            <p className="config-hint">Long duration, low intensity isometric holds. Ideal for tendon healing and early-stage rehab. Aim to match the target force steadily.</p>
            <div className="config-grid">
              <div className="config-field"><label>Known Max (kg)</label><div className="config-input-group"><button onClick={()=>setMaxForce(v=>Math.max(1,v-1))} className="config-btn">−</button><span className="config-value">{maxForce} kg</span><button onClick={()=>setMaxForce(v=>v+1)} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Target %</label><div className="config-input-group"><button onClick={()=>setTargetPct(v=>Math.max(10,v-5))} className="config-btn">−</button><span className="config-value">{targetPct}%</span><button onClick={()=>setTargetPct(v=>Math.min(60,v+5))} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Hold Time</label><div className="config-input-group"><button onClick={()=>setHoldTime(v=>Math.max(10,v-5))} className="config-btn">−</button><span className="config-value">{holdTime}s</span><button onClick={()=>setHoldTime(v=>v+5)} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Rest Time</label><div className="config-input-group"><button onClick={()=>setRestTime(v=>Math.max(10,v-10))} className="config-btn">−</button><span className="config-value">{restTime}s</span><button onClick={()=>setRestTime(v=>v+10)} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Sets</label><div className="config-input-group"><button onClick={()=>setSets(v=>Math.max(1,v-1))} className="config-btn">−</button><span className="config-value">{sets}</span><button onClick={()=>setSets(v=>v+1)} className="config-btn">+</button></div></div>
            </div>
            <div className="config-summary"><span>Target force: {target} kg ({targetPct}% of {maxForce} kg)</span></div>
          </div>
          <button className="btn btn--start" onClick={start} disabled={!connected}>{connected?'Start Submaximal Isometrics':'Connect Sensor to Start'}</button>
        </div>
      )}

      {(phase==='getReady'||phase==='work'||phase==='rest')&&(
        <div className="repeaters-active">
          <div className={`phase-banner ${pc[phase]}`}><span className="phase-label">{phase==='getReady'?'GET READY':phase==='work'?'HOLD STEADY':'REST'}</span></div>
          <div className="timer-container">
            <svg className="timer-ring" viewBox="0 0 120 120"><circle className="timer-ring-bg" cx="60" cy="60" r="54" fill="none" strokeWidth="6"/><circle className="timer-ring-progress" cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeDasharray={`${2*Math.PI*54}`} strokeDashoffset={2*Math.PI*54*(1-timeLeft/(phase==='getReady'?5:phase==='work'?holdTime:restTime))} strokeLinecap="round"/></svg>
            <div className="timer-text">{Math.ceil(timeLeft)}</div>
          </div>
          <div className="counters"><div className="counter"><span className="counter-label">Set</span><span className="counter-value">{currentSet}/{sets}</span></div></div>
          <div className="live-force">
            <span className="live-force-value">{latestForce.toFixed(1)}</span><span className="live-force-unit">kg</span>
            <span className={`live-force-target ${latestForce>=target*0.9?'on-target':'below-target'}`}>Target: {target} kg</span>
          </div>
          <button className="btn btn--stop" onClick={stop}>Stop</button>
        </div>
      )}

      {phase==='done'&&(
        <div className="repeaters-summary">
          <div className="summary-header"><div className="summary-checkmark">✓</div><h2>Submaximal Session Complete!</h2></div>
          <p style={{color:'var(--text-secondary)',textAlign:'center'}}>{sets} sets × {holdTime}s at {target} kg completed.</p>
          <div className="summary-actions"><button className="btn btn--primary" onClick={()=>setPhase('config')}>New Session</button><button className="btn btn--secondary" onClick={()=>navigate('/rehab')}>Back to Rehab</button></div>
        </div>
      )}
    </div>
  )
}
