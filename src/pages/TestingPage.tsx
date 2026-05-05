import { useNavigate } from 'react-router-dom'

const tests = [
  {
    id: 'mvc',
    title: 'MVC Test',
    description: 'Maximum Voluntary Contraction — 5 second max pull to find your peak force',
    icon: '💥',
    path: '/testing/mvc',
    available: true,
  },
  {
    id: 'critical-force',
    title: 'Critical Force',
    description: 'Intermittent isometric test — find your sustainable force ceiling',
    icon: '🔬',
    path: '/testing/critical-force',
    available: true,
  },
  {
    id: 'rfd',
    title: 'Rate of Force Development',
    description: 'Measure how fast you can produce force from zero',
    icon: '⚡',
    path: '/testing/rfd',
    available: true,
  },
  {
    id: 'endurance',
    title: 'Endurance (Time to Failure)',
    description: 'Hold at a target force until failure — measure your endurance capacity',
    icon: '⏱️',
    path: '/testing/endurance',
    available: false,
  },
]

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

      <div className="protocol-list">
        {tests.map((t) => (
          <button
            key={t.id}
            id={`test-${t.id}`}
            className={`protocol-card ${!t.available ? 'protocol-card--disabled' : ''}`}
            onClick={() => t.available && navigate(t.path)}
            disabled={!t.available}
          >
            <div className="protocol-card-icon">{t.icon}</div>
            <div className="protocol-card-content">
              <h3 className="protocol-card-title">
                {t.title}
                {!t.available && <span className="coming-soon-badge">Coming Soon</span>}
              </h3>
              <p className="protocol-card-desc">{t.description}</p>
            </div>
            {t.available && <div className="protocol-card-arrow">→</div>}
          </button>
        ))}
      </div>
    </div>
  )
}
