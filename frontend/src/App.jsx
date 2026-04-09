import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import FacultyDashboard from './pages/FacultyDashboard'
import DeoDashboard from './pages/DeoDashboard'
import AttendanceForm from './pages/AttendanceForm'
import TestPage from './pages/TestPage'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
    setLoading(false)
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-100">Loading...</div>
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage setUser={setUser} />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/attend/:sessionId" element={<AttendanceForm />} />
        <Route 
          path="/admin/*" 
          element={user?.role === 'admin' ? <AdminDashboard user={user} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/faculty/*" 
          element={user?.role === 'faculty' ? <FacultyDashboard user={user} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/deo/*" 
          element={user?.role === 'deo' ? <DeoDashboard user={user} /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={user ? `/${user.role}` : "/login"} />} />
      </Routes>
    </Router>
  )
}

export default App
