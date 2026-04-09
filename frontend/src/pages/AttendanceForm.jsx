import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { attendanceAPI } from '../api/apiClient'
import { CheckCircle2, AlertCircle, Clock, ClipboardCheck, Loader2 } from 'lucide-react'

export default function AttendanceForm() {
  const { sessionId } = useParams()
  const [sessionInfo, setSessionInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({ name: '', rollNumber: '', email: '' })

  useEffect(() => {
    fetchSessionInfo()
  }, [sessionId])

  const fetchSessionInfo = async () => {
    try {
      const response = await attendanceAPI.getSessionInfo(sessionId)
      setSessionInfo(response.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired attendance session')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.name.trim() || !formData.rollNumber.trim()) {
      setError('Name and Roll Number are required')
      return
    }

    setSubmitting(true)
    try {
      await attendanceAPI.submitAttendance({
        sessionId,
        name: formData.name.trim(),
        rollNumber: formData.rollNumber.trim(),
        email: formData.email.trim()
      })
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit attendance')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading attendance session...</p>
        </div>
      </div>
    )
  }

  // Error state (invalid session)
  if (!sessionInfo && error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-100 mb-2">Session Not Available</h1>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  // Expired session
  if (sessionInfo?.isExpired) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <Clock className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-100 mb-2">Session Expired</h1>
          <p className="text-gray-400 text-sm">This attendance session has expired. Please contact your faculty.</p>
          <div className="mt-4 p-3 bg-gray-800/50 rounded-xl">
            <p className="text-xs text-gray-500">Subject: <span className="text-gray-300">{sessionInfo.subjectName}</span></p>
            <p className="text-xs text-gray-500">Faculty: <span className="text-gray-300">{sessionInfo.facultyName}</span></p>
          </div>
        </div>
      </div>
    )
  }

  // Closed session
  if (sessionInfo && !sessionInfo.isActive) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-100 mb-2">Session Closed</h1>
          <p className="text-gray-400 text-sm">This attendance session has been closed by the faculty.</p>
        </div>
      </div>
    )
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Attendance Recorded!</h1>
          <p className="text-gray-400 text-sm mb-6">Your attendance has been successfully submitted.</p>
          <div className="bg-gray-800/50 rounded-xl p-4 space-y-2 text-left">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-200">{formData.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Roll Number</span>
              <span className="text-gray-200 font-mono">{formData.rollNumber}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subject</span>
              <span className="text-gray-200">{sessionInfo.subjectName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Faculty</span>
              <span className="text-gray-200">{sessionInfo.facultyName}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Attendance Form
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ClipboardCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-100">Mark Your Attendance</h1>
          <p className="text-gray-500 text-xs mt-1">Fill in your details to confirm attendance</p>
        </div>

        {/* Session Info */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6 space-y-1.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subject</span>
            <span className="text-gray-200 font-medium">{sessionInfo.subjectName} ({sessionInfo.subjectCode})</span>
          </div>
          {sessionInfo.departmentName && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Department</span>
              <span className="text-gray-200">{sessionInfo.departmentName}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Faculty</span>
            <span className="text-gray-200">{sessionInfo.facultyName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Session</span>
            <span className="text-blue-400 font-mono font-bold">{sessionInfo.sessionCode}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Full Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Enter your full name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Roll Number *</label>
            <input
              type="text"
              value={formData.rollNumber}
              onChange={e => setFormData({ ...formData, rollNumber: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="e.g., 21CSE001"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-2">Email (Optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="your.email@college.edu"
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-3 px-4 rounded-xl hover:from-blue-500 hover:to-cyan-500 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              <><ClipboardCheck className="w-4 h-4" /> Submit Attendance</>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-gray-600 mt-4">
          Smart Attendance System &middot; QR Based Attendance
        </p>
      </div>
    </div>
  )
}
