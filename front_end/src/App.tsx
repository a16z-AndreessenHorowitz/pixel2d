import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { GamePage } from './pages/GamePage'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app-shell">
        <main className="app-main">
          <Routes>
            <Route path="/" element={<GamePage />} />
            <Route path="*" element={<Navigate to="/game" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
