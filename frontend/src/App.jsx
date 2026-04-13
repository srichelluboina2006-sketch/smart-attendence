import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import SignUpPage from './pages/SignUpPage'
import AdminDashboard from './pages/AdminDashboard'
import FacultyDashboard from './pages/FacultyDashboard'
import DeoDashboard from './pages/DeoDashboard'
import AttendanceForm from './pages/AttendanceForm'
import TestPage from './pages/TestPage'
import { authAPI } from './api/apiClient'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [hasUsers, setHasUsers] = useState(true)

  const checkUsersExist = async () => {
    try {
      const res = await authAPI.checkUsers()
      setHasUsers(res.data.hasUsers)
    } catch {
      setHasUsers(true)
    }
  }

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        setUser(JSON.parse(storedUser))
      }
      await checkUsersExist()
      setLoading(false)
    }
    init()
  }, [])

  const handleSetUser = (userData) => {
    setUser(userData)
    if (userData) setHasUsers(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    checkUsersExist()
  }

  if (loading) {
    return <div className="flex items-center justify-center h-screen bg-gray-950 text-gray-400">Loading...</div>
  }

  const defaultRedirect = user ? `/${user.role}` : (hasUsers ? '/login' : '/signup')

  return (
    <Router>
      <Routes>
        <Route path="/login" element={!hasUsers ? <Navigate to="/signup" /> : <LoginPage setUser={handleSetUser} />} />
        <Route path="/signup" element={<SignUpPage setUser={handleSetUser} />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/attend/:sessionId" element={<AttendanceForm />} />
        <Route 
          path="/admin/*" 
          element={user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/faculty/*" 
          element={user?.role === 'faculty' ? <FacultyDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route 
          path="/deo/*" 
          element={user?.role === 'deo' ? <DeoDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/login" />} 
        />
        <Route path="/" element={<Navigate to={defaultRedirect} />} />
      </Routes>
    </Router>
  )
}

export default App
