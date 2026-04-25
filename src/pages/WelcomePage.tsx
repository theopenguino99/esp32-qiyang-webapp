import { useNavigate } from 'react-router-dom'

const categories = [
  {
    id: 'training',
    title: 'Training',
    icon: '🏋️',
    description: 'Build finger strength with structured hangboard protocols',
    path: '/training',
    gradient: 'welcome-card--training',
  },
  {
    id: 'testing',
    title: 'Testing',
    icon: '📊',
    description: 'Measure your max force and benchmark your progress',
    path: '/testing',
    gradient: 'welcome-card--testing',
  },
  {
    id: 'rehab',
    title: 'Rehab',
    icon: '🩹',
    description: 'Guided recovery and return-to-climbing protocols',
    path: '/rehab',
    gradient: 'welcome-card--rehab',
  },
]

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="welcome-page">
      <div className="welcome-hero">
        <div className="welcome-glow" />
        <h1 className="welcome-title">
          <span className="welcome-title-crimp">crimp</span>
          <span className="welcome-title-er">-ER</span>
        </h1>
        <p className="welcome-subtitle">Force Monitor</p>
        <p className="welcome-tagline">
          Precision finger strength training, testing &amp; rehabilitation
        </p>
      </div>

      <div className="welcome-grid">
        {categories.map((cat) => (
          <button
            key={cat.id}
            id={`category-${cat.id}`}
            className={`welcome-card ${cat.gradient}`}
            onClick={() => navigate(cat.path)}
          >
            <div className="welcome-card-icon">{cat.icon}</div>
            <h2 className="welcome-card-title">{cat.title}</h2>
            <p className="welcome-card-desc">{cat.description}</p>
            <div className="welcome-card-arrow">→</div>
          </button>
        ))}
      </div>

      <div className="welcome-footer">
        <p>Connect your ESP32-C6 sensor to get started</p>
      </div>
    </div>
  )
}
