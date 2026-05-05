import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBleContext } from '../context/BleContext'
import { playWorkBeep, playRestBeep, playDoneBeep, playCountdownBeep } from '../utils/audio'

const STORAGE_KEY = 'crimp-er-custom-protocols'

interface CustomProtocol {
  id: string
  name: string
  workTime: number
  restTime: number
  reps: number
  sets: number
  restBetweenSets: number
  targetForce: number
  createdAt: number
}

type Phase = 'config' | 'getReady' | 'work' | 'rest' | 'setRest' | 'done'

function loadProtocols(): CustomProtocol[] {
  try { const s = localStorage.getItem(STORAGE_KEY); return s ? JSON.parse(s) : [] }
  catch { return [] }
}
function saveProtocols(p: CustomProtocol[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)) }

export default function CustomPage() {
  const navigate = useNavigate()
  const { connected, latestForce, resetReadings } = useBleContext()
  const [tab, setTab] = useState<'my' | 'create' | 'community' | 'run'>('my')
  const [protocols, setProtocols] = useState<CustomProtocol[]>(loadProtocols)
  const [editing, setEditing] = useState<CustomProtocol>({
    id: '', name: 'My Protocol', workTime: 7, restTime: 3, reps: 6, sets: 3, restBetweenSets: 120, targetForce: 0, createdAt: 0,
  })
  const [activeProtocol, setActiveProtocol] = useState<CustomProtocol | null>(null)
  const [phase, setPhase] = useState<Phase>('config')
  const [timeLeft, setTimeLeft] = useState(0)
  const [currentRep, setCurrentRep] = useState(1)
  const [currentSet, setCurrentSet] = useState(1)

  const timerRef = useRef<ReturnType<typeof setInterval>|null>(null)
  const startRef = useRef(0)
  const repRef = useRef(1); useEffect(()=>{repRef.current=currentRep},[currentRep])
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

  // Protocol execution
  const finishRest = useCallback(()=>{
    if(!activeProtocol) return
    if(repRef.current>=activeProtocol.reps){
      if(setRefN.current>=activeProtocol.sets){clear();playDoneBeep();setPhase('done');return}
      playRestBeep();setPhase('setRest')
      cd(activeProtocol.restBetweenSets,()=>{
        setCurrentSet(p=>p+1);setCurrentRep(1);playWorkBeep();setPhase('work')
        cd(activeProtocol.workTime,finishRest)
      })
      return
    }
    playRestBeep();setPhase('rest')
    cd(activeProtocol.restTime,()=>{
      setCurrentRep(p=>p+1);playWorkBeep();setPhase('work')
      cd(activeProtocol.workTime,finishRest)
    })
  },[activeProtocol,clear,cd])

  const runProtocol = (p: CustomProtocol) => {
    setActiveProtocol(p);setCurrentRep(1);setCurrentSet(1);setTab('run');setPhase('config')
  }

  const startRun = useCallback(()=>{
    if(!activeProtocol) return
    resetReadings();setCurrentRep(1);setCurrentSet(1);setPhase('getReady')
    cd(5,()=>{playWorkBeep();setPhase('work');cd(activeProtocol.workTime,finishRest)})
  },[activeProtocol,cd,resetReadings,finishRest])

  const stopRun = useCallback(()=>{clear();setPhase('config');setTab('my')},[clear])
  useEffect(()=>()=>clear(),[clear])

  const saveProtocol = () => {
    const p = { ...editing, id: Date.now().toString(), createdAt: Date.now() }
    const updated = [...protocols, p]
    setProtocols(updated); saveProtocols(updated); setTab('my')
  }

  const deleteProtocol = (id: string) => {
    const updated = protocols.filter(p => p.id !== id)
    setProtocols(updated); saveProtocols(updated)
  }

  const pc:Record<Phase,string>={config:'',getReady:'phase--getready',work:'phase--work',rest:'phase--rest',setRest:'phase--setrest',done:'phase--done'}

  return (
    <div className={`page-container ${tab==='run'?`repeaters-page ${pc[phase]}`:''}`}>
      <div className="page-header">
        <button className="back-btn" onClick={()=>{stopRun();navigate('/')}}>← Back</button>
        <div><h1 className="page-title">🛠️ Custom Protocols</h1><p className="page-subtitle">Build, save, and share training protocols</p></div>
      </div>

      {/* Tab bar */}
      {tab!=='run'&&(
        <div className="custom-tabs">
          <button className={`custom-tab ${tab==='my'?'custom-tab--active':''}`} onClick={()=>setTab('my')}>My Protocols</button>
          <button className={`custom-tab ${tab==='create'?'custom-tab--active':''}`} onClick={()=>setTab('create')}>Create New</button>
          <button className={`custom-tab ${tab==='community'?'custom-tab--active':''}`} onClick={()=>setTab('community')}>Community</button>
        </div>
      )}

      {/* MY PROTOCOLS */}
      {tab==='my'&&(
        <div className="protocol-list">
          {protocols.length===0&&(
            <div className="coming-soon-container" style={{padding:'40px 20px'}}>
              <div className="coming-soon-icon">📝</div>
              <h2 className="coming-soon-title">No Protocols Yet</h2>
              <p className="coming-soon-text">Create your first custom protocol using the "Create New" tab.</p>
            </div>
          )}
          {protocols.map(p=>(
            <div key={p.id} className="protocol-card" style={{cursor:'default'}}>
              <div className="protocol-card-icon">🛠️</div>
              <div className="protocol-card-content">
                <h3 className="protocol-card-title">{p.name}</h3>
                <p className="protocol-card-desc">{p.reps}×{p.workTime}s on / {p.restTime}s off — {p.sets} sets</p>
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn--primary" style={{padding:'6px 14px',fontSize:13}} onClick={()=>runProtocol(p)} disabled={!connected}>▶</button>
                <button className="btn btn--stop" style={{padding:'6px 14px',fontSize:13,marginTop:0}} onClick={()=>deleteProtocol(p.id)}>✕</button>
              </div>
            </div>
          ))}
          {/* ══ DATA STORAGE PLACEHOLDER ══ */}
          {/* TODO: Replace localStorage with cloud storage (Firebase/Supabase)
              - Sync protocols across devices per user account
              - Enable exporting/importing protocols as JSON
              - Store protocol execution history and results */}
        </div>
      )}

      {/* CREATE NEW */}
      {tab==='create'&&(
        <div className="repeaters-config">
          <div className="config-section">
            <h2 className="config-section-title">Protocol Builder</h2>
            <div className="config-field" style={{marginBottom:16}}>
              <label>Protocol Name</label>
              <input className="custom-name-input" value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} placeholder="My Protocol" />
            </div>
            <div className="config-grid">
              <div className="config-field"><label>Work Time</label><div className="config-input-group"><button onClick={()=>setEditing(e=>({...e,workTime:Math.max(1,e.workTime-1)}))} className="config-btn">−</button><span className="config-value">{editing.workTime}s</span><button onClick={()=>setEditing(e=>({...e,workTime:e.workTime+1}))} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Rest Time</label><div className="config-input-group"><button onClick={()=>setEditing(e=>({...e,restTime:Math.max(1,e.restTime-1)}))} className="config-btn">−</button><span className="config-value">{editing.restTime}s</span><button onClick={()=>setEditing(e=>({...e,restTime:e.restTime+1}))} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Reps / Set</label><div className="config-input-group"><button onClick={()=>setEditing(e=>({...e,reps:Math.max(1,e.reps-1)}))} className="config-btn">−</button><span className="config-value">{editing.reps}</span><button onClick={()=>setEditing(e=>({...e,reps:e.reps+1}))} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Sets</label><div className="config-input-group"><button onClick={()=>setEditing(e=>({...e,sets:Math.max(1,e.sets-1)}))} className="config-btn">−</button><span className="config-value">{editing.sets}</span><button onClick={()=>setEditing(e=>({...e,sets:e.sets+1}))} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Set Rest</label><div className="config-input-group"><button onClick={()=>setEditing(e=>({...e,restBetweenSets:Math.max(10,e.restBetweenSets-10)}))} className="config-btn">−</button><span className="config-value">{editing.restBetweenSets}s</span><button onClick={()=>setEditing(e=>({...e,restBetweenSets:e.restBetweenSets+10}))} className="config-btn">+</button></div></div>
              <div className="config-field"><label>Target Force</label><div className="config-input-group"><button onClick={()=>setEditing(e=>({...e,targetForce:Math.max(0,+(e.targetForce-0.5).toFixed(1))}))} className="config-btn">−</button><span className="config-value">{editing.targetForce>0?`${editing.targetForce} kg`:'Off'}</span><button onClick={()=>setEditing(e=>({...e,targetForce:+(e.targetForce+0.5).toFixed(1)}))} className="config-btn">+</button></div></div>
            </div>
          </div>
          <button className="btn btn--start" onClick={saveProtocol}>Save Protocol</button>
        </div>
      )}

      {/* COMMUNITY — placeholder for cloud-based sharing */}
      {tab==='community'&&(
        <div className="coming-soon-container">
          <div className="coming-soon-icon">🌐</div>
          <h2 className="coming-soon-title">Community Protocols</h2>
          <p className="coming-soon-text">
            Browse, download, and share training protocols created by other climbers. Rate and review protocols to help the community find the best ones.
          </p>
          <div className="community-placeholder-features">
            <div className="community-feature"><span>📤</span> Share your protocols publicly</div>
            <div className="community-feature"><span>📥</span> Import protocols from other users</div>
            <div className="community-feature"><span>⭐</span> Rate and review protocols</div>
            <div className="community-feature"><span>👤</span> User profiles and training logs</div>
          </div>
          {/* ══ COMMUNITY DATA STORAGE PLACEHOLDER ══ */}
          {/* TODO: Implement cloud backend for community features:
              - User authentication (OAuth / email)
              - Protocol database (Firestore / Supabase)
              - Upload/download protocols with metadata (author, description, difficulty, ratings)
              - Search & filter by protocol type, difficulty, popularity
              - User profiles with training history
              - Comments and ratings system
              - Protocol versioning and forking */}
        </div>
      )}

      {/* RUNNING A PROTOCOL */}
      {tab==='run'&&activeProtocol&&(
        <>
          {phase==='config'&&(
            <div className="repeaters-config">
              <div className="config-section">
                <h2 className="config-section-title">{activeProtocol.name}</h2>
                <p className="config-hint">{activeProtocol.reps}×{activeProtocol.workTime}s on / {activeProtocol.restTime}s off — {activeProtocol.sets} sets</p>
              </div>
              <button className="btn btn--start" onClick={startRun} disabled={!connected}>{connected?'Start':'Connect Sensor'}</button>
              <button className="btn btn--secondary" style={{marginTop:8,width:'100%'}} onClick={()=>setTab('my')}>Cancel</button>
            </div>
          )}
          {(phase==='getReady'||phase==='work'||phase==='rest'||phase==='setRest')&&(
            <div className="repeaters-active">
              <div className={`phase-banner ${pc[phase]}`}><span className="phase-label">{phase==='getReady'?'GET READY':phase==='work'?'PULL!':phase==='rest'?'REST':'SET REST'}</span></div>
              <div className="timer-container">
                <svg className="timer-ring" viewBox="0 0 120 120"><circle className="timer-ring-bg" cx="60" cy="60" r="54" fill="none" strokeWidth="6"/><circle className="timer-ring-progress" cx="60" cy="60" r="54" fill="none" strokeWidth="6" strokeDasharray={`${2*Math.PI*54}`} strokeDashoffset={2*Math.PI*54*(1-timeLeft/(phase==='getReady'?5:phase==='work'?activeProtocol.workTime:phase==='rest'?activeProtocol.restTime:activeProtocol.restBetweenSets))} strokeLinecap="round"/></svg>
                <div className="timer-text">{Math.ceil(timeLeft)}</div>
              </div>
              <div className="counters"><div className="counter"><span className="counter-label">Rep</span><span className="counter-value">{currentRep}/{activeProtocol.reps}</span></div><div className="counter"><span className="counter-label">Set</span><span className="counter-value">{currentSet}/{activeProtocol.sets}</span></div></div>
              <div className="live-force"><span className="live-force-value">{latestForce.toFixed(1)}</span><span className="live-force-unit">kg</span></div>
              <button className="btn btn--stop" onClick={stopRun}>Stop</button>
            </div>
          )}
          {phase==='done'&&(
            <div className="repeaters-summary">
              <div className="summary-header"><div className="summary-checkmark">✓</div><h2>{activeProtocol.name} Complete!</h2></div>
              <div className="summary-actions"><button className="btn btn--primary" onClick={()=>{setPhase('config')}}>Run Again</button><button className="btn btn--secondary" onClick={()=>{setPhase('config');setTab('my')}}>Back to My Protocols</button></div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
