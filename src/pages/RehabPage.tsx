import { useNavigate } from 'react-router-dom'

export default function RehabPage() {
  const navigate = useNavigate()

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <div>
          <h1 className="page-title">🩹 Rehab</h1>
          <p className="page-subtitle">Guided recovery protocols</p>
        </div>
      </div>

      <div className="coming-soon-container">
        <div className="coming-soon-icon">🩹</div>
        <h2 className="coming-soon-title">Coming Soon</h2>
        <p className="coming-soon-text">
          Progressive loading, tendon rehab protocols, and return-to-climbing guidance are being developed.
        </p>
      </div>
    </div>
  )
}
