import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { useBleContext } from '../context/BleContext'
import { useAuthContext } from '../context/AuthContext'
import { saveSession } from '../lib/sessionSaver'

type Phase = 'config' | 'getReady' | 'work' | 'rest' | 'setRest' | 'done'

interface RepeatersConfig {
  workTime: number
  restTime: number
  repsPerSet: number
  numberOfSets: number
  restBetweenSets: number
  targetForce: number // in kg, 0 = no target
}

interface SetSummary {
  setNumber: number
  avgForce: number
  peakForce: number
  readings: { time: number; force: number }[]
}

const DEFAULT_CONFIG: RepeatersConfig = {
  workTime: 7,
  restTime: 3,
  repsPerSet: 6,
  numberOfSets: 3,
  restBetweenSets: 120,
  targetForce: 0,
}

// Audio beep helper using Web Audio API
function playBeep(frequency: number, duration: number, volume = 0.3) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    osc.type = 'sine'
    gain.gain.value = volume
    osc.start()
    osc.stop(ctx.currentTime + duration / 1000)
    setTimeout(() => ctx.close(), duration + 100)
  } catch {
    // Audio not available — silent fallback
  }
}

function playWorkBeep() { playBeep(880, 200) }
function playRestBeep() { playBeep(440, 300) }
function playDoneBeep() {
  playBeep(660, 150)
  setTimeout(() => playBeep(880, 150), 200)
  setTimeout(() => playBeep(1100, 300), 400)
}
function playCountdownBeep() { playBeep(600, 100, 0.15) }

export default function RepeatersPage() {
  const navigate = useNavigate()
  const { connected, latestForce, readings, resetReadings } = useBleContext()
  const { user } = useAuthContext()

  const [config, setConfig] = useState<RepeatersConfig>(DEFAULT_CONFIG)
  const [phase, setPhase] = useState<Phase>('config')
  const [timeLeft, setTimeLeft] = useState(0)
  const [currentRep, setCurrentRep] = useState(1)
  const [currentSet, setCurrentSet] = useState(1)
  const [setReadingsBuffer, setSetReadingsBuffer] = useState<{ time: number; force: number }[]>([])
  const [workReadings, setWorkReadings] = useState<{ time: number; force: number }[]>([])
  const [summaries, setSummaries] = useState<SetSummary[]>([])
  const [mvcValue, setMvcValue] = useState(0)
  const [showMvcTest, setShowMvcTest] = useState(false)
  const [mvcCountdown, setMvcCountdown] = useState(0)
  const [mvcTesting, setMvcTesting] = useState(false)
  const [mvcPeak, setMvcPeak] = useState(0)

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const phaseRef = useRef<Phase>('config')
  const startTimeRef = useRef(0)
  const currentRepRef = useRef(1)
  const currentSetRef = useRef(1)

  // Keep refs in sync
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { currentRepRef.current = currentRep }, [currentRep])
  useEffect(() => { currentSetRef.current = currentSet }, [currentSet])

  // Track force readings during active phases (work + rest + setRest for continuous chart)
  useEffect(() => {
    if (phase === 'work' || phase === 'rest' || phase === 'setRest') {
      setSetReadingsBuffer(prev => [...prev, { time: prev.length, force: latestForce }])
    }
    if (phase === 'work') {
      setWorkReadings(prev => [...prev, { time: prev.length, force: latestForce }])
    }
  }, [latestForce, phase])

  // MVC test — track peak
  useEffect(() => {
    if (mvcTesting && latestForce > mvcPeak) {
      setMvcPeak(latestForce)
    }
  }, [latestForce, mvcTesting, mvcPeak])

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startCountdown = useCallback((duration: number, onComplete: () => void) => {
    setTimeLeft(duration)
    startTimeRef.current = Date.now()
    clearTimer()

    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const remaining = Math.max(0, duration - elapsed)
      setTimeLeft(remaining)

      // Countdown beeps for last 3 seconds
      const prevRemaining = remaining + 0.1
      if (Math.ceil(remaining) !== Math.ceil(prevRemaining) && remaining <= 3 && remaining > 0) {
        playCountdownBeep()
      }

      if (remaining <= 0) {
        clearTimer()
        onComplete()
      }
    }, 50)
  }, [clearTimer])

  const finishProtocol = useCallback(() => {
    clearTimer()
    playDoneBeep()
    setPhase('done')
  }, [clearTimer])

  // Auto-save session on completion
  useEffect(() => {
    if (phase === 'done' && summaries.length > 0) {
      const allForces = summaries.flatMap(s => [s.avgForce, s.peakForce])
      saveSession(user, {
        protocol_type: 'repeaters', protocol_name: 'Repeaters',
        peak_force: Math.max(...summaries.map(s => s.peakForce)),
        avg_force: summaries.reduce((a, s) => a + s.avgForce, 0) / summaries.length,
        sets_data: summaries, config,
      })
    }
  }, [phase])

  const startSetRest = useCallback(() => {
    // Save current set summary
    const setForces = workReadings.map(r => r.force)
    setSummaries(prev => [...prev, {
      setNumber: currentSet,
      avgForce: setForces.length > 0 ? setForces.reduce((a, b) => a + b, 0) / setForces.length : 0,
      peakForce: setForces.length > 0 ? Math.max(...setForces) : 0,
      readings: [...workReadings],
    }])
    setWorkReadings([])

    if (currentSet >= config.numberOfSets) {
      finishProtocol()
      return
    }

    playRestBeep()
    setPhase('setRest')
    startCountdown(config.restBetweenSets, () => {
      setCurrentSet(prev => prev + 1)
      setCurrentRep(1)
      setSetReadingsBuffer([])
      playWorkBeep()
      setPhase('work')
      startCountdown(config.workTime, startRest)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSet, config, workReadings, finishProtocol, startCountdown])

  const startRest = useCallback(() => {
    if (currentRep >= config.repsPerSet) {
      startSetRest()
      return
    }

    playRestBeep()
    setPhase('rest')
    startCountdown(config.restTime, () => {
      setCurrentRep(prev => prev + 1)
      playWorkBeep()
      setPhase('work')
      startCountdown(config.workTime, startRest)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRep, config, startCountdown, startSetRest])

  // Rebuild startSetRest and startRest to avoid stale closures via refs
  const startRestRef = useRef(startRest)
  const startSetRestRef = useRef(startSetRest)
  useEffect(() => { startRestRef.current = startRest }, [startRest])
  useEffect(() => { startSetRestRef.current = startSetRest }, [startSetRest])

  const startProtocol = useCallback(() => {
    resetReadings()
    setWorkReadings([])
    setSetReadingsBuffer([])
    setSummaries([])
    setCurrentRep(1)
    setCurrentSet(1)
    setPhase('getReady')

    startCountdown(5, () => {
      playWorkBeep()
      setPhase('work')
      startCountdown(config.workTime, () => startRestRef.current())
    })
  }, [config, startCountdown, resetReadings])

  const stopProtocol = useCallback(() => {
    clearTimer()
    setPhase('config')
    setWorkReadings([])
    setSetReadingsBuffer([])
  }, [clearTimer])

  // Re-wire the startRest callback to use the ref for the recursive call
  useEffect(() => {
    startRestRef.current = () => {
      if (currentRepRef.current >= config.repsPerSet) {
        startSetRestRef.current()
        return
      }
      playRestBeep()
      setPhase('rest')
      startCountdown(config.restTime, () => {
        setCurrentRep(prev => prev + 1)
        playWorkBeep()
        setPhase('work')
        startCountdown(config.workTime, () => startRestRef.current())
      })
    }
  }, [currentRep, config, startCountdown])

  useEffect(() => {
    startSetRestRef.current = () => {
      const setForces = workReadings.map(r => r.force)
      setSummaries(prev => [...prev, {
        setNumber: currentSetRef.current,
        avgForce: setForces.length > 0 ? setForces.reduce((a, b) => a + b, 0) / setForces.length : 0,
        peakForce: setForces.length > 0 ? Math.max(...setForces) : 0,
        readings: [...workReadings],
      }])
      setWorkReadings([])

      if (currentSetRef.current >= config.numberOfSets) {
        finishProtocol()
        return
      }

      playRestBeep()
      setPhase('setRest')
      startCountdown(config.restBetweenSets, () => {
        setCurrentSet(prev => prev + 1)
        setCurrentRep(1)
        setSetReadingsBuffer([])
        playWorkBeep()
        setPhase('work')
        startCountdown(config.workTime, () => startRestRef.current())
      })
    }
  }, [currentSet, config, workReadings, finishProtocol, startCountdown])

  // Cleanup on unmount
  useEffect(() => () => clearTimer(), [clearTimer])

  const startMvcTest = () => {
    setMvcPeak(0)
    setMvcTesting(false)
    setMvcCountdown(3)
    setShowMvcTest(true)

    let count = 3
    const countInterval = setInterval(() => {
      count--
      setMvcCountdown(count)
      playCountdownBeep()
      if (count <= 0) {
        clearInterval(countInterval)
        setMvcTesting(true)
        playWorkBeep()
        // 5 second test
        setTimeout(() => {
          setMvcTesting(false)
          playDoneBeep()
          // mvcPeak will be set by the effect
          setTimeout(() => {
            setMvcValue(prev => prev) // trigger re-render
          }, 100)
        }, 5000)
      }
    }, 1000)
  }

  const applyMvc = () => {
    setMvcValue(mvcPeak)
    setConfig(prev => ({ ...prev, targetForce: Math.round(mvcPeak * 0.8 * 10) / 10 }))
    setShowMvcTest(false)
  }

  const phaseColors: Record<Phase, string> = {
    config: '',
    getReady: 'phase--getready',
    work: latestForce >= config.targetForce && config.targetForce > 0
      ? 'phase--work-ontarget'
      : 'phase--work',
    rest: 'phase--rest',
    setRest: 'phase--setrest',
    done: 'phase--done',
  }

  const phaseLabels: Record<Phase, string> = {
    config: '',
    getReady: 'GET READY',
    work: 'PULL!',
    rest: 'REST',
    setRest: 'SET REST',
    done: 'COMPLETE',
  }

  // Chart data: latest N readings
  const chartData = setReadingsBuffer.slice(-400)

  const totalWorkTime = config.workTime * config.repsPerSet * config.numberOfSets
  const totalRestTime = config.restTime * (config.repsPerSet - 1) * config.numberOfSets
  const totalSetRest = config.restBetweenSets * (config.numberOfSets - 1)
  const totalSessionTime = totalWorkTime + totalRestTime + totalSetRest

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60)
    const secs = Math.floor(s % 60)
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`
  }

  return (
    <div className={`page-container repeaters-page ${phaseColors[phase]}`}>
      <div className="page-header">
        <button className="back-btn" onClick={() => { stopProtocol(); navigate('/training') }}>
          ← Back
        </button>
        <div>
          <h1 className="page-title">🔄 Repeaters</h1>
          <p className="page-subtitle">Strength-endurance hangboard protocol</p>
        </div>
      </div>

      {/* ═══ CONFIG PHASE ═══ */}
      {phase === 'config' && (
        <div className="repeaters-config">
          <div className="config-section">
            <h2 className="config-section-title">Protocol Settings</h2>

            <div className="config-grid">
              <div className="config-field">
                <label>Work Time</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({ ...c, workTime: Math.max(1, c.workTime - 1) }))} className="config-btn">−</button>
                  <span className="config-value">{config.workTime}s</span>
                  <button onClick={() => setConfig(c => ({ ...c, workTime: c.workTime + 1 }))} className="config-btn">+</button>
                </div>
              </div>

              <div className="config-field">
                <label>Rest Time</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({ ...c, restTime: Math.max(1, c.restTime - 1) }))} className="config-btn">−</button>
                  <span className="config-value">{config.restTime}s</span>
                  <button onClick={() => setConfig(c => ({ ...c, restTime: c.restTime + 1 }))} className="config-btn">+</button>
                </div>
              </div>

              <div className="config-field">
                <label>Reps / Set</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({ ...c, repsPerSet: Math.max(1, c.repsPerSet - 1) }))} className="config-btn">−</button>
                  <span className="config-value">{config.repsPerSet}</span>
                  <button onClick={() => setConfig(c => ({ ...c, repsPerSet: c.repsPerSet + 1 }))} className="config-btn">+</button>
                </div>
              </div>

              <div className="config-field">
                <label>Sets</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({ ...c, numberOfSets: Math.max(1, c.numberOfSets - 1) }))} className="config-btn">−</button>
                  <span className="config-value">{config.numberOfSets}</span>
                  <button onClick={() => setConfig(c => ({ ...c, numberOfSets: c.numberOfSets + 1 }))} className="config-btn">+</button>
                </div>
              </div>

              <div className="config-field">
                <label>Set Rest</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({ ...c, restBetweenSets: Math.max(10, c.restBetweenSets - 10) }))} className="config-btn">−</button>
                  <span className="config-value">{formatTime(config.restBetweenSets)}</span>
                  <button onClick={() => setConfig(c => ({ ...c, restBetweenSets: c.restBetweenSets + 10 }))} className="config-btn">+</button>
                </div>
              </div>

              <div className="config-field">
                <label>Target Force</label>
                <div className="config-input-group">
                  <button onClick={() => setConfig(c => ({ ...c, targetForce: Math.max(0, +(c.targetForce - 0.5).toFixed(1)) }))} className="config-btn">−</button>
                  <span className="config-value">{config.targetForce > 0 ? `${config.targetForce} kg` : 'Off'}</span>
                  <button onClick={() => setConfig(c => ({ ...c, targetForce: +(c.targetForce + 0.5).toFixed(1) }))} className="config-btn">+</button>
                </div>
              </div>
            </div>

            <div className="config-summary">
              <span>Total session: ~{formatTime(totalSessionTime)}</span>
              <span>Work: {formatTime(totalWorkTime)} | Rest: {formatTime(totalRestTime + totalSetRest)}</span>
            </div>
          </div>

          {/* MVC Test Section */}
          <div className="config-section">
            <h2 className="config-section-title">Quick MVC Test (Optional)</h2>
            <p className="config-hint">Pull as hard as you can for 5 seconds to set your target force</p>

            {showMvcTest ? (
              <div className="mvc-test-area">
                {mvcCountdown > 0 && !mvcTesting && (
                  <div className="mvc-countdown">{mvcCountdown}</div>
                )}
                {mvcTesting && (
                  <div className="mvc-active">
                    <div className="mvc-label">PULL MAX!</div>
                    <div className="mvc-peak">{mvcPeak.toFixed(1)} kg</div>
                  </div>
                )}
                {!mvcTesting && mvcCountdown <= 0 && mvcPeak > 0 && (
                  <div className="mvc-result">
                    <div className="mvc-result-value">MVC: {mvcPeak.toFixed(1)} kg</div>
                    <div className="mvc-result-target">80% Target: {(mvcPeak * 0.8).toFixed(1)} kg</div>
                    <button className="btn btn--primary" onClick={applyMvc}>Apply as Target</button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="btn btn--secondary"
                onClick={startMvcTest}
                disabled={!connected}
              >
                {connected ? 'Start MVC Test' : 'Connect sensor first'}
              </button>
            )}
          </div>

          <button
            id="start-repeaters"
            className="btn btn--start"
            onClick={startProtocol}
            disabled={!connected}
          >
            {connected ? 'Start Protocol' : 'Connect Sensor to Start'}
          </button>
        </div>
      )}

      {/* ═══ ACTIVE PROTOCOL ═══ */}
      {(phase === 'getReady' || phase === 'work' || phase === 'rest' || phase === 'setRest') && (
        <div className="repeaters-active">
          {/* Phase indicator */}
          <div className={`phase-banner ${phaseColors[phase]}`}>
            <span className="phase-label">{phaseLabels[phase]}</span>
          </div>

          {/* Countdown timer */}
          <div className="timer-container">
            <svg className="timer-ring" viewBox="0 0 120 120">
              <circle
                className="timer-ring-bg"
                cx="60" cy="60" r="54"
                fill="none"
                strokeWidth="6"
              />
              <circle
                className="timer-ring-progress"
                cx="60" cy="60" r="54"
                fill="none"
                strokeWidth="6"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={
                  2 * Math.PI * 54 * (1 - timeLeft / (
                    phase === 'getReady' ? 5 :
                      phase === 'work' ? config.workTime :
                        phase === 'rest' ? config.restTime :
                          config.restBetweenSets
                  ))
                }
                strokeLinecap="round"
              />
            </svg>
            <div className="timer-text">{Math.ceil(timeLeft)}</div>
          </div>

          {/* Rep & Set counters */}
          <div className="counters">
            <div className="counter">
              <span className="counter-label">Rep</span>
              <span className="counter-value">{currentRep}/{config.repsPerSet}</span>
            </div>
            <div className="counter">
              <span className="counter-label">Set</span>
              <span className="counter-value">{currentSet}/{config.numberOfSets}</span>
            </div>
          </div>

          {/* Live force display */}
          <div className="live-force">
            <span className="live-force-value">{latestForce.toFixed(1)}</span>
            <span className="live-force-unit">kg</span>
            {config.targetForce > 0 && (
              <span className={`live-force-target ${latestForce >= config.targetForce ? 'on-target' : 'below-target'}`}>
                Target: {config.targetForce} kg
              </span>
            )}
          </div>

          {/* Force chart */}
          {chartData.length > 2 && (
            <div className="repeaters-chart">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" hide />
                  <YAxis stroke="#64748b" domain={[0, 'auto']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px' }}
                    labelStyle={{ display: 'none' }}
                  />
                  {config.targetForce > 0 && (
                    <ReferenceLine y={config.targetForce} stroke="#f59e0b" strokeDasharray="6 4" strokeWidth={2} />
                  )}
                  <Line type="monotone" dataKey="force" stroke="#3b82f6" dot={false} isAnimationActive={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <button className="btn btn--stop" onClick={stopProtocol}>
            Stop Protocol
          </button>
        </div>
      )}

      {/* ═══ DONE PHASE ═══ */}
      {phase === 'done' && (
        <div className="repeaters-summary">
          <div className="summary-header">
            <div className="summary-checkmark">✓</div>
            <h2>Protocol Complete!</h2>
          </div>

          <div className="summary-stats">
            {summaries.map((s) => (
              <div key={s.setNumber} className="summary-set-card">
                <h3>Set {s.setNumber}</h3>
                <div className="summary-set-stats">
                  <div>
                    <span className="stat-label">Avg Force</span>
                    <span className="stat-value">{s.avgForce.toFixed(1)} kg</span>
                  </div>
                  <div>
                    <span className="stat-label">Peak Force</span>
                    <span className="stat-value stat-value--peak">{s.peakForce.toFixed(1)} kg</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {summaries.length > 0 && (
            <div className="summary-totals">
              <div className="summary-total-item">
                <span className="stat-label">Overall Avg</span>
                <span className="stat-value">
                  {(summaries.reduce((a, s) => a + s.avgForce, 0) / summaries.length).toFixed(1)} kg
                </span>
              </div>
              <div className="summary-total-item">
                <span className="stat-label">Session Peak</span>
                <span className="stat-value stat-value--peak">
                  {Math.max(...summaries.map(s => s.peakForce)).toFixed(1)} kg
                </span>
              </div>
            </div>
          )}

          <div className="summary-actions">
            <button className="btn btn--primary" onClick={() => setPhase('config')}>
              New Session
            </button>
            <button className="btn btn--secondary" onClick={() => navigate('/training')}>
              Back to Training
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
