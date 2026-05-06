import { useNavigate } from 'react-router-dom'

const protocols = [
  {
    id: 'progressive-loading',
    title: 'Progressive Loading',
    description: 'Gradual force increase from low to high % of max — safe tendon loading',
    icon: '📈',
    path: '/rehab/progressive-loading',
    available: true,
  },
  {
    id: 'submaximal',
    title: 'Submaximal Isometrics',
    description: 'Long holds at low intensity for tendon healing and early-stage rehab',
    icon: '🧘',
    path: '/rehab/submaximal',
    available: true,
  },
  {
    id: 'tendon-gliding',
    title: 'Tendon Gliding',
    description: 'Guided tendon gliding exercises for finger mobility and recovery',
    icon: '🖐️',
    path: '/rehab/tendon-gliding',
    available: false,
  },
]

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

      <div className="protocol-list">
        {protocols.map((proto) => (
          <button
            key={proto.id}
            id={`rehab-${proto.id}`}
            className={`protocol-card ${!proto.available ? 'protocol-card--disabled' : ''}`}
            onClick={() => proto.available && navigate(proto.path)}
            disabled={!proto.available}
          >
            <div className="protocol-card-icon">{proto.icon}</div>
            <div className="protocol-card-content">
              <h3 className="protocol-card-title">
                {proto.title}
                {!proto.available && <span className="coming-soon-badge">Coming Soon</span>}
              </h3>
              <p className="protocol-card-desc">{proto.description}</p>
            </div>
            {proto.available && <div className="protocol-card-arrow">→</div>}
          </button>
        ))}
      </div>
    </div>
  )
}
