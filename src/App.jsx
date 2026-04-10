import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Hamburger from './components/ui/Hamburger/Hamburger.jsx'
import ExerciseGuide from './components/pages/ExerciseGuide.jsx'
import StretchingGuide from './components/pages/StretchingGuide.jsx'
import CustomWorkout from './components/pages/CustomWorkout.jsx'



function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="app-container">
        <header>
          <Hamburger />
        </header>
        
        <main className="content">
          <Routes>
            <Route path="/" element={<ExerciseGuide />} />
            <Route path="/exercises" element={<ExerciseGuide />} />
            <Route path="/custom-workout" element={<CustomWorkout />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
