import { useNavigate } from 'react-router-dom'

export default function TestingPage() {
  const navigate = useNavigate()

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <div>
          <h1 className="page-title">📊 Testing</h1>
          <p className="page-subtitle">Measure and benchmark your progress</p>
        </div>
      </div>

      <div className="coming-soon-container">
        <div className="coming-soon-icon">📊</div>
        <h2 className="coming-soon-title">Coming Soon</h2>
        <p className="coming-soon-text">
          MVC testing, Critical Force assessment, and more testing protocols are being developed.
        </p>
      </div>
    </div>
  )
}
