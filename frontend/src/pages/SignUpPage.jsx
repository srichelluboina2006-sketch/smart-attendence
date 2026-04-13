import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../api/apiClient'

const SignUpPage = ({ setUser }) => {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('admin')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignUp = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 4) {
      setError('Password must be at least 4 characters')
      return
    }

    setLoading(true)

    try {
      const response = await authAPI.register({ name, username, password, email, role })

      if (response.data.success) {
        const userData = {
          id: response.data.userId,
          username: response.data.username,
          name: response.data.name,
          email: response.data.email,
          role: response.data.role,
          token: response.data.token
        }
        localStorage.setItem('user', JSON.stringify(userData))
        localStorage.setItem('token', response.data.token)
        setUser(userData)
        navigate(`/${response.data.role}`)
      } else {
        setError(response.data.message || 'Registration failed')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Create Account</h1>
          <p className="text-gray-500 text-sm mt-1">Set up your Smart Attendance account</p>
        </div>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-200 placeholder-gray-500 outline-none transition-all"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Username *</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-200 placeholder-gray-500 outline-none transition-all"
              placeholder="Choose a username"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-200 placeholder-gray-500 outline-none transition-all"
              placeholder="Enter your email (optional)"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Role *</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-200 outline-none transition-all"
            >
              <option value="admin">Admin</option>
              <option value="faculty">Faculty</option>
              <option value="deo">Data Entry Operator</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Password * (min 4 characters)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-200 placeholder-gray-500 outline-none transition-all"
              placeholder="Create a password"
              required
              minLength={4}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Confirm Password *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-200 placeholder-gray-500 outline-none transition-all"
              placeholder="Confirm your password"
              required
              minLength={4}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-emerald-500 hover:to-cyan-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-600/20"
          >
            {loading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Already have an account?{' '}
            <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default SignUpPage
