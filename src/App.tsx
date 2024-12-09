import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './components/Login'
import Inventory from '../src/components/Inventory'
import './App.css'

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta pública */}
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to="/inventory" />} 
        />

        {/* Ruta protegida */}
        <Route 
          path="/inventory" 
          element={isAuthenticated ? <Inventory /> : <Navigate to="/login" />} 
        />

        {/* Redirección por defecto */}
        <Route 
          path="/" 
          element={<Navigate to={isAuthenticated ? "/inventory" : "/login"} />} 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
