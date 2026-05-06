import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useBleContext } from '../context/BleContext'
import { useAuthContext } from '../context/AuthContext'
import { saveSession } from '../lib/sessionSaver'
import { playWorkBeep, playRestBeep, playDoneBeep, playCountdownBeep } from '../utils/audio'

type Phase = 'config' | 'getReady' | 'work' | 'rest' | 'done'

// Critical Force protocol: repeated 7s on / 3s off hangs until failure or N reps
export default function CriticalForcePage() {
  const navigate = useNavigate()
  const { connected, latestForce, resetReadings } = useBleContext()
  const { user } = useAuthContext()
  const [reps, setReps] = useState(24)
  const [phase, setPhase] = useState<Phase>('config')
  const [timeLeft, setTimeLeft] = useState(0)
  const [currentRep, setCurrentRep] = useState(1)
  const [allForces, setAllForces] = useState<{time:number;force:number}[]>([])
  const [repAvgs, setRepAvgs] = useState<number[]>([])
  const [repBuf, setRepBuf] = useState<number[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const startRef = useRef(0)
  const repRef = useRef(1); useEffect(()=>{repRef.current=currentRep},[currentRep])
  const bufRef = useRef(repBuf); useEffect(()=>{bufRef.current=repBuf},[repBuf])

  const clear = useCallback(()=>{if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null}},[])
  const cd = useCallback((dur:number,cb:()=>void)=>{
    setTimeLeft(dur);startRef.current=Date.now();clear()
    timerRef.current=setInterval(()=>{
      const r=Math.max(0,dur-(Date.now()-startRef.current)/1000);setTimeLeft(r)
      if(Math.ceil(r)!==Math.ceil(r+0.1)&&r<=3&&r>0) playCountdownBeep()
      if(r<=0){clear();cb()}
    },50)
  },[clear])

  useEffect(()=>{
    if(phase==='work'){
      setAllForces(p=>[...p,{time:p.length,force:latestForce}])
      setRepBuf(p=>[...p,latestForce])
    }
  },[latestForce,phase])

  const finishRep = useCallback(()=>{
    const avg = bufRef.current.length>0 ? bufRef.current.reduce((a,b)=>a+b,0)/bufRef.current.length : 0
    setRepAvgs(p=>[...p,avg]); setRepBuf([])
    if(repRef.current>=reps){clear();playDoneBeep();setPhase('done');return}
    playRestBeep();setPhase('rest')
    cd(3,()=>{setCurrentRep(p=>p+1);playWorkBeep();setPhase('work');cd(7,finishRep)})
  },[reps,clear,cd])

  const start = useCallback(()=>{
    resetReadings();setAllForces([]);setRepAvgs([]);setRepBuf([]);setCurrentRep(1);setPhase('getReady')
    cd(5,()=>{playWorkBeep();setPhase('work');cd(7,finishRep)})
  },[cd,resetReadings,finishRep])
  const stop = useCallback(()=>{clear();setPhase('config')},[clear])
  useEffect(()=>()=>clear(),[clear])

  useEffect(() => {
    if (phase === 'done' && repAvgs.length > 0) {
      const cf = repAvgs.length >= 6 ? repAvgs.slice(-6).reduce((a,b) => a+b, 0) / 6 : null
      saveSession(user, {
        protocol_type: 'critical-force', protocol_name: 'Critical Force',
        peak_force: Math.max(...repAvgs),
        avg_force: cf ?? repAvgs.reduce((a,b) => a+b, 0) / repAvgs.length,
        sets_data: { repAvgs, cf }, config: { reps },
      })
    }
  }, [phase])

  // Critical Force = average of last 6 rep averages
  const cf = repAvgs.length>=6 ? repAvgs.slice(-6).reduce((a,b)=>a+b,0)/6 : null

  const pc:Record<Phase,string>={config:'',getReady:'phase--getready',work:'phase--work',rest:'phase--rest',done:'phase--done'}

  return (
    <div className={`page-container repeaters-page ${pc[phase]}`}>
      <div className="page-header">
        <button className="back-btn" onClick={()=>{stop();navigate('/testing')}}>← Back</button>
        <div><h1 className="page-title">🔬 Critical Force</h1><p className="page-subtitle">Intermittent isometric test — 7s on / 3s off</p></div>
      </div>

      {phase==='config'&&(
        <div className="repeaters-config">
          <div className="config-section">
            <h2 className="config-section-title">Critical Force Test</h2>
            <p className="config-hint">Perform repeated 7s max pulls with 3s rest. Critical Force is the average force of the last 6 reps — your sustainable force ceiling.</p>
            <div className="config-grid">
              <div className="config-field"><label>Total Reps</label><div className="config-input-group"><button onClick={()=>setReps(r=>Math.max(6,r-1))} className="config-btn">−</button><span className="config-value">{reps}</span><button onClick={()=>setReps(r=>r+1)} className="config-btn">+</button></div></div>
            </div>
          </div>
          <button className="btn btn--start" onClick={start} disabled={!connected}>{connected?'Start Critical Force Test':'Connect Sensor to Start'}</button>
        </div>
      )}

      {(phase==='getReady'||phase==='work'||phase==='rest')&&(
        <div className="repeaters-active">
          <div className={`phase-banner ${pc[phase]}`}><span className="phase-label">{phase==='getReady'?'GET READY':phase==='work'?'PULL!':'REST'}</span></div>
          <div className="timer-container">
            <svg className="timer-ring" viewBox="0 0 120 120"><circle className="timer-ring-bg" cx="60" cy="60" r="54" fill="none" strokeWidth="6"/><circle className="timer-ring-progress" cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeDasharray={`${2*Math.PI*54}`} strokeDashoffset={2*Math.PI*54*(1-timeLeft/(phase==='getReady'?5:phase==='work'?7:3))} strokeLinecap="round"/></svg>
            <div className="timer-text">{Math.ceil(timeLeft)}</div>
          </div>
          <div className="counters"><div className="counter"><span className="counter-label">Rep</span><span className="counter-value">{currentRep}/{reps}</span></div></div>
          <div className="live-force"><span className="live-force-value">{latestForce.toFixed(2)}</span><span className="live-force-unit">kg</span></div>
          <button className="btn btn--stop" onClick={stop}>Stop Test</button>
        </div>
      )}

      {phase==='done'&&(
        <div className="repeaters-summary">
          <div className="summary-header"><div className="summary-checkmark">✓</div><h2>Critical Force Test Complete</h2></div>
          <div className="summary-totals">
            {cf!==null&&<div className="summary-total-item"><span className="stat-label">Critical Force</span><span className="stat-value stat-value--peak">{cf.toFixed(2)} kg</span></div>}
            <div className="summary-total-item"><span className="stat-label">Peak Rep Avg</span><span className="stat-value">{repAvgs.length>0?Math.max(...repAvgs).toFixed(2):'—'} kg</span></div>
          </div>
          {repAvgs.length>1&&(
            <div className="repeaters-chart" style={{width:'100%'}}>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={repAvgs.map((v,i)=>({rep:i+1,force:v}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/><XAxis dataKey="rep" stroke="#64748b" label={{value:'Rep',position:'insideBottom',offset:-5,fill:'#64748b'}}/>
                  <YAxis stroke="#64748b" domain={[0,'auto']}/>
                  {cf!==null&&<ReferenceLine y={cf} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={2} label={{value:`CF: ${cf.toFixed(2)}`,fill:'#f59e0b',fontSize:12}}/>}
                  <Line type="monotone" dataKey="force" stroke="#3b82f6" strokeWidth={2}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="summary-actions"><button className="btn btn--primary" onClick={()=>setPhase('config')}>Test Again</button><button className="btn btn--secondary" onClick={()=>navigate('/testing')}>Back to Testing</button></div>
        </div>
      )}
    </div>
  )
}
