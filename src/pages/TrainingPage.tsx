import { useNavigate } from 'react-router-dom'

const protocols = [
  {
    id: 'repeaters',
    title: 'Repeaters',
    description: '7/3 strength-endurance hangboard protocol with real-time force tracking',
    icon: '🔄',
    path: '/training/repeaters',
    available: true,
  },
  {
    id: 'max-hangs',
    title: 'Max Hangs',
    description: 'Heavy load, long rest — pure max strength development',
    icon: '💪',
    path: '/training/max-hangs',
    available: true,
  },
  {
    id: 'density-hangs',
    title: 'Density Hangs',
    description: 'High volume sub-maximal hangs for tendon conditioning',
    icon: '🧱',
    path: '/training/density-hangs',
    available: true,
  },
]

export default function TrainingPage() {
  const navigate = useNavigate()

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back
        </button>
        <div>
          <h1 className="page-title">🏋️ Training</h1>
          <p className="page-subtitle">Choose a training protocol</p>
        </div>
      </div>

      <div className="protocol-list">
        {protocols.map((proto) => (
          <button
            key={proto.id}
            id={`protocol-${proto.id}`}
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
