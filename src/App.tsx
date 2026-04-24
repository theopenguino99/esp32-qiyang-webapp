import { HashRouter, Routes, Route } from 'react-router-dom'
import { BleProvider } from './context/BleContext'
import BleStatusBar from './components/BleStatusBar'
import WelcomePage from './pages/WelcomePage'
import TrainingPage from './pages/TrainingPage'
import RepeatersPage from './pages/RepeatersPage'
import TestingPage from './pages/TestingPage'
import RehabPage from './pages/RehabPage'

export default function App() {
  return (
    <BleProvider>
      <HashRouter>
        <div className="app-shell">
          <BleStatusBar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<WelcomePage />} />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/training/repeaters" element={<RepeatersPage />} />
              <Route path="/testing" element={<TestingPage />} />
              <Route path="/rehab" element={<RehabPage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </BleProvider>
  )
}
