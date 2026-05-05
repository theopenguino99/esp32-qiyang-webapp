import { HashRouter, Routes, Route } from 'react-router-dom'
import { BleProvider } from './context/BleContext'
import BleStatusBar from './components/BleStatusBar'
import WelcomePage from './pages/WelcomePage'
import TrainingPage from './pages/TrainingPage'
import RepeatersPage from './pages/RepeatersPage'
import MaxHangsPage from './pages/MaxHangsPage'
import DensityHangsPage from './pages/DensityHangsPage'
import TestingPage from './pages/TestingPage'
import MvcTestPage from './pages/MvcTestPage'
import CriticalForcePage from './pages/CriticalForcePage'
import RfdTestPage from './pages/RfdTestPage'
import RehabPage from './pages/RehabPage'
import ProgressiveLoadingPage from './pages/ProgressiveLoadingPage'
import SubmaximalPage from './pages/SubmaximalPage'
import CalibrationPage from './pages/CalibrationPage'
import CustomPage from './pages/CustomPage'

export default function App() {
  return (
    <BleProvider>
      <HashRouter>
        <div className="app-shell">
          <BleStatusBar />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<WelcomePage />} />
              {/* Training */}
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/training/repeaters" element={<RepeatersPage />} />
              <Route path="/training/max-hangs" element={<MaxHangsPage />} />
              <Route path="/training/density-hangs" element={<DensityHangsPage />} />
              {/* Testing */}
              <Route path="/testing" element={<TestingPage />} />
              <Route path="/testing/mvc" element={<MvcTestPage />} />
              <Route path="/testing/critical-force" element={<CriticalForcePage />} />
              <Route path="/testing/rfd" element={<RfdTestPage />} />
              {/* Rehab */}
              <Route path="/rehab" element={<RehabPage />} />
              <Route path="/rehab/progressive-loading" element={<ProgressiveLoadingPage />} />
              <Route path="/rehab/submaximal" element={<SubmaximalPage />} />
              {/* Utilities */}
              <Route path="/calibration" element={<CalibrationPage />} />
              <Route path="/custom" element={<CustomPage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </BleProvider>
  )
}
