import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBleContext } from '../context/BleContext'
import { playWorkBeep, playRestBeep, playDoneBeep, playCountdownBeep } from '../utils/audio'

type Phase = 'config' | 'getReady' | 'work' | 'rest' | 'done'

export default function ProgressiveLoadingPage() {
  const navigate = useNavigate()
  const { connected, latestForce, resetReadings } = useBleContext()
  const [holdTime, setHoldTime] = useState(10)
  const [restTime, setRestTime] = useState(60)
  const [steps, setSteps] = useState(5) // number of progressive increments
  const [startPct, setStartPct] = useState(20) // start at 20% of max
  const [endPct, setEndPct] = useState(80) // end at 80% of max
  const [maxForce, setMaxForce] = useState(20) // user's known max in kg
  const [phase, setPhase] = useState<Phase>('config')
  const [timeLeft, setTimeLeft] = useState(0)
  const [currentStep, setCurrentStep] = useState(1)
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const startRef = useRef(0)
  const stepRef = useRef(1)
  useEffect(()=>{stepRef.current=currentStep},[currentStep])

  const clear = useCallback(()=>{if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null}},[])
  const cd = useCallback((dur:number,cb:()=>void)=>{
    setTimeLeft(dur);startRef.current=Date.now();clear()
    timerRef.current=setInterval(()=>{
      const r=Math.max(0,dur-(Date.now()-startRef.current)/1000);setTimeLeft(r)
      if(Math.ceil(r)!==Math.ceil(r+0.1)&&r<=3&&r>0) playCountdownBeep()
      if(r<=0){clear();cb()}
    },50)
  },[clear])

  const targetForStep = (s: number) => {
    const pct = startPct + (endPct - startPct) * ((s - 1) / Math.max(1, steps - 1))
    return Math.round(maxForce * pct / 100 * 10) / 10
  }

  const currentTarget = targetForStep(currentStep)

  const finishStep = useCallback(()=>{
    if(stepRef.current>=steps){clear();playDoneBeep();setPhase('done');return}
    playRestBeep();setPhase('rest')
    cd(restTime,()=>{setCurrentStep(p=>p+1);playWorkBeep();setPhase('work');cd(holdTime,finishStep)})
  },[steps,restTime,holdTime,clear,cd])

  const start = useCallback(()=>{
    resetReadings();setCurrentStep(1);setPhase('getReady')
    cd(5,()=>{playWorkBeep();setPhase('work');cd(holdTime,finishStep)})
  },[holdTime,cd,resetReadings,finishStep])
  const stop = useCallback(()=>{clear();setPhase('config')},[clear])
  useEffect(()=>()=>clear(),[clear])

  const pc:Record<Phase,string>={config:'',getReady:'phase--getready',work:'phase--work',rest:'phase--rest',done:'phase--done'}

  return (
    <div className={`page-container repeaters-page ${pc[phase]}`}>
      <div className="page-header">
        <button className="back-btn" onClick={()=>{stop();navigate('/rehab')}}>← Back</button>
        <div><h1 className="page-title">📈 Progressive Loading</h1><p className="page-subtitle">Gradual force increase for safe tendon loading</p></div>
      </div>

      {phase==='config'&&(
        <div className="repeaters-config">
          <div className="config-section">
            <h2 className="config-section-title">Protocol Settings</h2>
            <p className="config-hint">Gradually increase load across steps. Each step has a target force based on your known max.</p>
            <div className="config-grid">
              <div className="config-field"><label>Known Max (kg)</label><div className="config-input-group"><button onClick={()=>setMaxForce(v=>Math.max(1,v-1))} className="config-btn">−</button><span className="config-value">{maxForce} kg</span><button onClick={()=>setMaxForce(v=>v+1)} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Hold Time</label><div className="config-input-group"><button onClick={()=>setHoldTime(v=>Math.max(5,v-5))} className="config-btn">−</button><span className="config-value">{holdTime}s</span><button onClick={()=>setHoldTime(v=>v+5)} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Rest Time</label><div className="config-input-group"><button onClick={()=>setRestTime(v=>Math.max(10,v-10))} className="config-btn">−</button><span className="config-value">{restTime}s</span><button onClick={()=>setRestTime(v=>v+10)} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Steps</label><div className="config-input-group"><button onClick={()=>setSteps(v=>Math.max(2,v-1))} className="config-btn">−</button><span className="config-value">{steps}</span><button onClick={()=>setSteps(v=>v+1)} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Start %</label><div className="config-input-group"><button onClick={()=>setStartPct(v=>Math.max(10,v-10))} className="config-btn">−</button><span className="config-value">{startPct}%</span><button onClick={()=>setStartPct(v=>Math.min(90,v+10))} className="config-btn">+</button></div></div>
              <div className="config-field"><label>End %</label><div className="config-input-group"><button onClick={()=>setEndPct(v=>Math.max(startPct+10,v-10))} className="config-btn">−</button><span className="config-value">{endPct}%</span><button onClick={()=>setEndPct(v=>Math.min(100,v+10))} className="config-btn">+</button></div></div>
            </div>
            <div className="config-summary">
              <span>Force range: {targetForStep(1)} kg → {targetForStep(steps)} kg</span>
            </div>
          </div>
          <button className="btn btn--start" onClick={start} disabled={!connected}>{connected?'Start Progressive Loading':'Connect Sensor to Start'}</button>
        </div>
      )}

      {(phase==='getReady'||phase==='work'||phase==='rest')&&(
        <div className="repeaters-active">
          <div className={`phase-banner ${pc[phase]}`}><span className="phase-label">{phase==='getReady'?'GET READY':phase==='work'?'HOLD':'REST'}</span></div>
          <div className="timer-container">
            <svg className="timer-ring" viewBox="0 0 120 120"><circle className="timer-ring-bg" cx="60" cy="60" r="54" fill="none" strokeWidth="6"/><circle className="timer-ring-progress" cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeDasharray={`${2*Math.PI*54}`} strokeDashoffset={2*Math.PI*54*(1-timeLeft/(phase==='getReady'?5:phase==='work'?holdTime:restTime))} strokeLinecap="round"/></svg>
            <div className="timer-text">{Math.ceil(timeLeft)}</div>
          </div>
          <div className="counters"><div className="counter"><span className="counter-label">Step</span><span className="counter-value">{currentStep}/{steps}</span></div></div>
          <div className="live-force">
            <span className="live-force-value">{latestForce.toFixed(1)}</span><span className="live-force-unit">kg</span>
            <span className={`live-force-target ${latestForce>=currentTarget?'on-target':'below-target'}`}>Target: {currentTarget} kg ({startPct + (endPct-startPct)*((currentStep-1)/Math.max(1,steps-1))}%)</span>
          </div>
          <button className="btn btn--stop" onClick={stop}>Stop</button>
        </div>
      )}

      {phase==='done'&&(
        <div className="repeaters-summary">
          <div className="summary-header"><div className="summary-checkmark">✓</div><h2>Progressive Loading Complete!</h2></div>
          <p style={{color:'var(--text-secondary)',textAlign:'center'}}>All {steps} steps completed safely.</p>
          <div className="summary-actions"><button className="btn btn--primary" onClick={()=>setPhase('config')}>New Session</button><button className="btn btn--secondary" onClick={()=>navigate('/rehab')}>Back to Rehab</button></div>
        </div>
      )}
    </div>
  )
}
