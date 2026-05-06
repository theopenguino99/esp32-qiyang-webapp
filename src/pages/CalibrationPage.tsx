import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBleContext } from '../context/BleContext'

export default function CalibrationPage() {
  const navigate = useNavigate()
  const { connected, latestForce, latestRawForce, calibration, updateCalibration, resetCalibration } = useBleContext()

  const [step, setStep] = useState<'menu' | 'tare' | 'scale'>('menu')
  const [samplingState, setSamplingState] = useState<'idle' | 'sampling' | 'done'>('idle')
  const [samples, setSamples] = useState<number[]>([])
  const [knownWeight, setKnownWeight] = useState(5)
  const sampleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Collect samples for 3 seconds
  const startSampling = () => {
    setSamples([])
    setSamplingState('sampling')
  }

  useEffect(() => {
    if (samplingState !== 'sampling') return

    const startTime = Date.now()
    sampleTimerRef.current = setInterval(() => {
      setSamples(prev => [...prev, latestRawForce])
      if (Date.now() - startTime > 3000) {
        clearInterval(sampleTimerRef.current!)
        sampleTimerRef.current = null
        setSamplingState('done')
      }
    }, 50)

    return () => {
      if (sampleTimerRef.current) clearInterval(sampleTimerRef.current)
    }
  }, [samplingState, latestRawForce])

  const avgSample = samples.length > 0
    ? samples.reduce((a, b) => a + b, 0) / samples.length
    : 0

  const handleTareDone = () => {
    updateCalibration({ ...calibration, offset: avgSample })
    setSamplingState('idle')
    setStep('menu')
  }

  const handleScaleDone = () => {
    const effectiveRaw = avgSample - calibration.offset
    if (effectiveRaw > 0.01) {
      updateCalibration({ ...calibration, scaleFactor: knownWeight / effectiveRaw })
    }
    setSamplingState('idle')
    setStep('menu')
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <div>
          <h1 className="page-title">⚖️ Calibration</h1>
          <p className="page-subtitle">Ensure accurate force measurements</p>
        </div>
      </div>

      {!connected && (
        <div className="calibration-warning">
          ⚠️ Connect your sensor first using the button below
        </div>
      )}

      {/* ═══ MENU ═══ */}
      {step === 'menu' && (
        <div className="calibration-menu">
          <div className="config-section">
            <h2 className="config-section-title">Current Calibration</h2>
            <div className="calibration-status-grid">
              <div className="calibration-stat">
                <span className="stat-label">Zero Offset</span>
                <span className="stat-value">{calibration.offset.toFixed(2)} kg</span>
              </div>
              <div className="calibration-stat">
                <span className="stat-label">Scale Factor</span>
                <span className="stat-value">{calibration.scaleFactor.toFixed(3)}×</span>
              </div>
              {connected && (
                <>
                  <div className="calibration-stat">
                    <span className="stat-label">Raw Reading</span>
                    <span className="stat-value" style={{ color: 'var(--text-muted)' }}>{latestRawForce.toFixed(2)} kg</span>
                  </div>
                  <div className="calibration-stat">
                    <span className="stat-label">Calibrated</span>
                    <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{latestForce.toFixed(2)} kg</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="config-section">
            <h2 className="config-section-title">Two-Point Calibration</h2>
            <p className="config-hint">Step 1: Zero with no load. Step 2: Hang a known weight to set the scale.</p>
            <div className="calibration-actions">
              <button
                className="btn btn--primary calibration-step-btn"
                onClick={() => { setSamplingState('idle'); setSamples([]); setStep('tare') }}
                disabled={!connected}
              >
                <span className="calibration-step-num">1</span>
                Tare (Zero)
              </button>
              <button
                className="btn btn--secondary calibration-step-btn"
                onClick={() => { setSamplingState('idle'); setSamples([]); setStep('scale') }}
                disabled={!connected}
              >
                <span className="calibration-step-num">2</span>
                Known Weight
              </button>
            </div>
          </div>

          <button className="btn btn--stop" onClick={resetCalibration}>
            Reset to Factory Defaults
          </button>
        </div>
      )}

      {/* ═══ TARE STEP ═══ */}
      {step === 'tare' && (
        <div className="calibration-step-panel">
          <div className="config-section">
            <h2 className="config-section-title">Step 1: Tare (Zero)</h2>
            <p className="config-hint">
              Remove all weight from the load cell. The sensor should be hanging freely with nothing attached.
            </p>

            {samplingState === 'idle' && (
              <button className="btn btn--start" onClick={startSampling}>
                Start Sampling (3s)
              </button>
            )}

            {samplingState === 'sampling' && (
              <div className="calibration-sampling">
                <div className="calibration-sampling-dot" />
                <span>Sampling... ({samples.length} readings)</span>
                <div className="calibration-live-value">{latestRawForce.toFixed(2)} kg (raw)</div>
              </div>
            )}

            {samplingState === 'done' && (
              <div className="calibration-result">
                <div className="calibration-result-label">Average zero reading:</div>
                <div className="calibration-result-value">{avgSample.toFixed(3)} kg</div>
                <p className="config-hint">This value will be subtracted from all future readings.</p>
                <div className="calibration-result-actions">
                  <button className="btn btn--primary" onClick={handleTareDone}>Apply Tare</button>
                  <button className="btn btn--secondary" onClick={() => { setSamplingState('idle'); setSamples([]) }}>Retry</button>
                </div>
              </div>
            )}
          </div>
          <button className="btn btn--secondary" style={{ marginTop: 16 }} onClick={() => setStep('menu')}>← Back to Menu</button>
        </div>
      )}

      {/* ═══ SCALE STEP ═══ */}
      {step === 'scale' && (
        <div className="calibration-step-panel">
          <div className="config-section">
            <h2 className="config-section-title">Step 2: Known Weight</h2>
            <p className="config-hint">
              Hang a known weight from the load cell and enter its value below.
            </p>

            <div className="config-field" style={{ marginBottom: 16 }}>
              <label>Known Weight (kg)</label>
              <div className="config-input-group">
                <button onClick={() => setKnownWeight(w => Math.max(0.5, +(w - 0.5).toFixed(1)))} className="config-btn">−</button>
                <span className="config-value">{knownWeight.toFixed(2)} kg</span>
                <button onClick={() => setKnownWeight(w => +(w + 0.5).toFixed(1))} className="config-btn">+</button>
              </div>
            </div>

            {samplingState === 'idle' && (
              <button className="btn btn--start" onClick={startSampling}>
                Start Sampling (3s)
              </button>
            )}

            {samplingState === 'sampling' && (
              <div className="calibration-sampling">
                <div className="calibration-sampling-dot" />
                <span>Sampling... ({samples.length} readings)</span>
                <div className="calibration-live-value">{latestRawForce.toFixed(2)} kg (raw)</div>
              </div>
            )}

            {samplingState === 'done' && (
              <div className="calibration-result">
                <div className="calibration-result-label">Average raw reading:</div>
                <div className="calibration-result-value">{avgSample.toFixed(3)} kg</div>
                <div className="calibration-result-label" style={{ marginTop: 8 }}>
                  Effective (after offset): {(avgSample - calibration.offset).toFixed(3)} kg
                </div>
                <div className="calibration-result-label">
                  Scale factor: {((avgSample - calibration.offset) > 0.01
                    ? (knownWeight / (avgSample - calibration.offset)).toFixed(3)
                    : '—')}×
                </div>
                <div className="calibration-result-actions">
                  <button className="btn btn--primary" onClick={handleScaleDone}>Apply Scale</button>
                  <button className="btn btn--secondary" onClick={() => { setSamplingState('idle'); setSamples([]) }}>Retry</button>
                </div>
              </div>
            )}
          </div>
          <button className="btn btn--secondary" style={{ marginTop: 16 }} onClick={() => setStep('menu')}>← Back to Menu</button>
        </div>
      )}
    </div>
  )
}
