import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { attendanceAPI } from '../api/apiClient'
import { LogOut, QrCode, LayoutDashboard, ClipboardList, Users, RefreshCw, X, Eye, Clock, CheckCircle2, AlertCircle, BookOpen, Plus, Trash2 } from 'lucide-react'

export default function FacultyDashboard({ user }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [allSubjects, setAllSubjects] = useState([])
  const [mySubjects, setMySubjects] = useState([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [subjectToAdd, setSubjectToAdd] = useState('')
  const [sessions, setSessions] = useState([])
  const [currentQR, setCurrentQR] = useState(null)
  const [viewingSession, setViewingSession] = useState(null)
  const [attendanceRecords, setAttendanceRecords] = useState([])
  const [sessionInfo, setSessionInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: '' })

  useEffect(() => {
    fetchAllSubjects()
    fetchMySubjects()
    fetchSessions()
  }, [])

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions()
    if (activeTab === 'subjects') { fetchAllSubjects(); fetchMySubjects() }
  }, [activeTab])

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 5000)
      return () => clearTimeout(timer)
    }
  }, [message])

  const fetchAllSubjects = async () => {
    try {
      const response = await attendanceAPI.getAllSubjects()
      setAllSubjects(response.data.data || [])
    } catch (err) {
      console.error('Error fetching all subjects:', err)
    }
  }

  const fetchMySubjects = async () => {
    try {
      const response = await attendanceAPI.getFacultySubjects(user.id)
      setMySubjects(response.data.data || [])
    } catch (err) {
      console.error('Error fetching my subjects:', err)
    }
  }

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const response = await attendanceAPI.getSessions(user.id)
      setSessions(response.data.data || [])
    } catch (err) {
      console.error('Error fetching sessions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubject = async () => {
    if (!subjectToAdd) return
    const alreadyAdded = mySubjects.find(s => s.id === subjectToAdd)
    if (alreadyAdded) {
      setMessage({ text: 'Subject already added to your list', type: 'error' })
      return
    }
    const newIds = [...mySubjects.map(s => s.id), subjectToAdd]
    setLoading(true)
    try {
      await attendanceAPI.assignFacultySubjects({ facultyId: user.id, subjectIds: newIds })
      await fetchMySubjects()
      setSubjectToAdd('')
      setMessage({ text: 'Subject added to your teaching list!', type: 'success' })
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Error assigning subject', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveSubject = async (subjectId) => {
    const newIds = mySubjects.filter(s => s.id !== subjectId).map(s => s.id)
    setLoading(true)
    try {
      await attendanceAPI.assignFacultySubjects({ facultyId: user.id, subjectIds: newIds })
      await fetchMySubjects()
      setMessage({ text: 'Subject removed from your list', type: 'success' })
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Error removing subject', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async () => {
    if (!selectedSubject) {
      setMessage({ text: 'Please select a subject first', type: 'error' })
      return
    }
    setLoading(true)
    try {
      const response = await attendanceAPI.createSession({
        facultyId: user.id,
        subjectId: selectedSubject
      })
      setCurrentQR({
        sessionId: response.data.sessionId,
        sessionCode: response.data.sessionCode,
        qrCodeBase64: response.data.qrCodeBase64,
        attendanceUrl: response.data.attendanceUrl,
        expiresAt: response.data.expiresAt,
        subjectName: response.data.subjectName
      })
      setMessage({ text: 'QR Code generated! Students can now scan to mark attendance.', type: 'success' })
      fetchSessions()
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Error creating session', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleViewRecords = async (sessionId) => {
    setLoading(true)
    try {
      const response = await attendanceAPI.getRecords(sessionId)
      setAttendanceRecords(response.data.data || [])
      setSessionInfo(response.data.session || null)
      setViewingSession(sessionId)
      setActiveTab('records')
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Error fetching records', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  // Subjects not yet assigned to this faculty (for the add dropdown)
  const availableSubjects = allSubjects.filter(s => !mySubjects.find(ms => ms.id === s.id))

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'subjects', label: 'My Subjects', icon: BookOpen },
    { id: 'qr', label: 'Create QR', icon: QrCode },
    { id: 'sessions', label: 'My Sessions', icon: ClipboardList },
  ]

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Smart Attendance</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Faculty Portal</p>
        </div>

        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
              {user.name?.[0]?.toUpperCase() || 'F'}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200 leading-tight">{user.name}</p>
              <p className="text-[11px] text-gray-500">FACULTY</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {sidebarItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${activeTab === item.id || (item.id === 'sessions' && activeTab === 'records') ? 'bg-blue-600/20 text-blue-400 font-medium' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'}`}>
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.id === 'subjects' && mySubjects.length > 0 && (
                <span className="ml-auto text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full">{mySubjects.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <button onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-6xl mx-auto">

          {/* Toast */}
          {message.text && (
            <div className={`mb-6 p-4 rounded-xl text-sm font-medium flex items-center justify-between ${message.type === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
              {message.text}
              <button onClick={() => setMessage({ text: '', type: '' })} className="ml-4 hover:opacity-70"><X className="w-4 h-4" /></button>
            </div>
          )}

          {/* ========== DASHBOARD ========== */}
          {activeTab === 'dashboard' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-1">Welcome, {user.name}</h2>
              <p className="text-gray-500 text-sm mb-8">Faculty Dashboard - QR Based Attendance System</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <div onClick={() => setActiveTab('subjects')} className="bg-gradient-to-br from-amber-600 to-orange-500 p-5 rounded-2xl text-white shadow-lg shadow-amber-500/20 cursor-pointer hover:scale-105 transition-all duration-200">
                  <BookOpen className="w-8 h-8 opacity-80 mb-3" />
                  <p className="text-3xl font-bold">{mySubjects.length}</p>
                  <p className="text-sm opacity-80 mt-1">My Subjects</p>
                </div>
                <div onClick={() => setActiveTab('qr')} className="bg-gradient-to-br from-blue-600 to-cyan-500 p-5 rounded-2xl text-white shadow-lg shadow-blue-500/20 cursor-pointer hover:scale-105 transition-all duration-200">
                  <QrCode className="w-8 h-8 opacity-80 mb-3" />
                  <p className="text-3xl font-bold">QR</p>
                  <p className="text-sm opacity-80 mt-1">Create Attendance</p>
                </div>
                <div onClick={() => setActiveTab('sessions')} className="bg-gradient-to-br from-purple-600 to-violet-500 p-5 rounded-2xl text-white shadow-lg shadow-purple-500/20 cursor-pointer hover:scale-105 transition-all duration-200">
                  <ClipboardList className="w-8 h-8 opacity-80 mb-3" />
                  <p className="text-3xl font-bold">{sessions.length}</p>
                  <p className="text-sm opacity-80 mt-1">Total Sessions</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600 to-green-500 p-5 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                  <Users className="w-8 h-8 opacity-80 mb-3" />
                  <p className="text-3xl font-bold">{sessions.reduce((sum, s) => sum + (s.submissionCount || 0), 0)}</p>
                  <p className="text-sm opacity-80 mt-1">Total Submissions</p>
                </div>
              </div>

              {mySubjects.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-6 flex items-center gap-4">
                  <AlertCircle className="w-6 h-6 text-amber-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-300">No subjects assigned yet</p>
                    <p className="text-xs text-gray-400 mt-1">Go to <button onClick={() => setActiveTab('subjects')} className="text-blue-400 underline">My Subjects</button> to select the subjects you teach. You need at least one subject to generate QR codes.</p>
                  </div>
                </div>
              )}

              {sessions.length > 0 && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-100">Recent Sessions</h3>
                    <button onClick={() => setActiveTab('sessions')} className="text-xs text-blue-400 hover:text-blue-300">View All</button>
                  </div>
                  <div className="space-y-2">
                    {sessions.slice(0, 5).map(s => (
                      <div key={s.id} onClick={() => handleViewRecords(s.id)}
                        className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-all cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className={`w-2.5 h-2.5 rounded-full ${s.isExpired ? 'bg-gray-500' : 'bg-emerald-400 animate-pulse'}`} />
                          <div>
                            <p className="text-sm font-medium text-gray-200">{s.subjectName} ({s.subjectCode})</p>
                            <p className="text-xs text-gray-500">Code: {s.sessionCode}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-lg font-medium">{s.submissionCount} present</span>
                          <Eye className="w-4 h-4 text-gray-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== MY SUBJECTS ========== */}
          {activeTab === 'subjects' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-1">My Subjects</h2>
              <p className="text-gray-500 text-sm mb-8">Select the subjects you teach. Only these will appear when creating QR attendance.</p>

              {/* Add Subject */}
              <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
                <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2"><Plus className="w-4 h-4" /> Add a Subject</h3>
                <div className="flex gap-3">
                  <select value={subjectToAdd} onChange={e => setSubjectToAdd(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                    <option value="">-- Select a subject to add --</option>
                    {availableSubjects.map(s => (
                      <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode}) - {s.departmentName}</option>
                    ))}
                  </select>
                  <button onClick={handleAddSubject} disabled={loading || !subjectToAdd}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>

              {/* My Subject List */}
              {mySubjects.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">No subjects assigned yet. Add subjects you teach from the dropdown above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mySubjects.map(s => (
                    <div key={s.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 flex items-center justify-between hover:border-gray-700 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                          {s.subjectCode?.substring(0, 2)}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-gray-100">{s.subjectName}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500">Code: <span className="font-mono text-gray-400">{s.subjectCode}</span></span>
                            {s.departmentName && <span className="text-xs text-gray-500">Dept: <span className="text-gray-400">{s.departmentName}</span></span>}
                          </div>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveSubject(s.id)}
                        className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all" title="Remove subject">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== CREATE QR ========== */}
          {activeTab === 'qr' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-100 mb-1">Create QR Attendance</h2>
              <p className="text-gray-500 text-sm mb-8">Generate a QR code for students to scan and mark attendance</p>

              {mySubjects.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center">
                  <BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-400 mb-2">No subjects assigned yet</p>
                  <p className="text-gray-500 text-sm mb-4">You need to select subjects you teach before generating QR codes.</p>
                  <button onClick={() => setActiveTab('subjects')} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-500 transition-all">
                    Go to My Subjects
                  </button>
                </div>
              ) : (
                <>
                  <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
                    <h3 className="text-sm font-semibold text-gray-300 mb-4">Select Subject</h3>
                    <div className="flex gap-3">
                      <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                        className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all">
                        <option value="">-- Select from your subjects --</option>
                        {mySubjects.map(s => (
                          <option key={s.id} value={s.id}>{s.subjectName} ({s.subjectCode}){s.departmentName ? ` - ${s.departmentName}` : ''}</option>
                        ))}
                      </select>
                      <button onClick={handleCreateSession} disabled={loading || !selectedSubject}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-medium hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                        <QrCode className="w-4 h-4" />
                        {loading ? 'Generating...' : 'Generate QR'}
                      </button>
                    </div>
                  </div>

                  {currentQR && (
                    <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-semibold text-emerald-400">QR Code Ready!</h3>
                          <p className="text-xs text-gray-500 mt-1">Students can scan this QR code with their phone to mark attendance</p>
                        </div>
                      </div>

                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="bg-white p-4 rounded-2xl shadow-xl">
                          <img src={`data:image/png;base64,${currentQR.qrCodeBase64}`} alt="QR Code" className="w-64 h-64" />
                        </div>

                        <div className="flex-1 space-y-3">
                          <div className="bg-gray-800/50 rounded-xl p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Subject</span>
                              <span className="text-gray-200 font-medium">{currentQR.subjectName}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Session Code</span>
                              <span className="text-blue-400 font-mono font-bold">{currentQR.sessionCode}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Expires</span>
                              <span className="text-amber-400 flex items-center gap-1"><Clock className="w-3 h-3" /> 10 minutes</span>
                            </div>
                          </div>

                          <div className="bg-gray-800/50 rounded-xl p-4">
                            <p className="text-xs text-gray-500 mb-2">Attendance URL (accessible from any device on same network):</p>
                            <div className="flex items-center gap-2">
                              <code className="flex-1 text-xs text-blue-400 bg-gray-900 p-2 rounded-lg break-all">{currentQR.attendanceUrl}</code>
                              <button onClick={() => { navigator.clipboard.writeText(currentQR.attendanceUrl); setMessage({ text: 'URL copied!', type: 'success' }) }}
                                className="px-3 py-2 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 transition-all whitespace-nowrap">
                                Copy
                              </button>
                            </div>
                          </div>

                          <button onClick={() => handleViewRecords(currentQR.sessionId)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-gray-300 rounded-xl text-sm hover:bg-gray-700 transition-all flex items-center justify-center gap-2">
                            <Eye className="w-4 h-4" /> View Live Submissions
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ========== SESSIONS LIST ========== */}
          {activeTab === 'sessions' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-100 mb-1">My Sessions</h2>
                  <p className="text-gray-500 text-sm">View all your attendance sessions and submissions</p>
                </div>
                <button onClick={fetchSessions} className="p-2.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-gray-200 transition-all">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {sessions.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center">
                  <ClipboardList className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">No sessions yet. Create a QR attendance session to get started.</p>
                  <button onClick={() => setActiveTab('qr')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-500 transition-all">
                    Create First Session
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map(s => (
                    <div key={s.id} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 hover:border-gray-700 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-3 h-3 rounded-full ${s.isExpired ? 'bg-gray-600' : 'bg-emerald-400 animate-pulse'}`} />
                          <div>
                            <p className="text-base font-semibold text-gray-100">{s.subjectName}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-gray-500">Code: <span className="font-mono text-gray-400">{s.sessionCode}</span></span>
                              <span className="text-xs text-gray-500">Subject: <span className="text-gray-400">{s.subjectCode}</span></span>
                              {s.departmentName && <span className="text-xs text-gray-500">Dept: <span className="text-gray-400">{s.departmentName}</span></span>}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right mr-2">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${s.isExpired ? 'bg-gray-700 text-gray-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                              {s.isExpired ? 'Expired' : 'Active'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">{s.submissionCount} submission{s.submissionCount !== 1 ? 's' : ''}</p>
                          </div>
                          <button onClick={() => handleViewRecords(s.id)}
                            className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-xl text-sm font-medium hover:bg-blue-600/30 transition-all flex items-center gap-2">
                            <Eye className="w-4 h-4" /> View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== ATTENDANCE RECORDS ========== */}
          {activeTab === 'records' && viewingSession && (
            <div>
              <button onClick={() => setActiveTab('sessions')} className="text-sm text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-1">
                &larr; Back to Sessions
              </button>

              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-100 mb-1">Attendance Records</h2>
                  {sessionInfo && (
                    <p className="text-gray-500 text-sm">
                      {sessionInfo.subjectName} ({sessionInfo.subjectCode}) &middot; Session: {sessionInfo.sessionCode}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-bold">{attendanceRecords.length} Present</span>
                  <button onClick={() => handleViewRecords(viewingSession)} className="p-2.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-xl hover:bg-gray-700 hover:text-gray-200 transition-all">
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {attendanceRecords.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center">
                  <Users className="w-12 h-12 text-gray-700 mx-auto mb-3" />
                  <p className="text-gray-500">No submissions yet. Waiting for students to scan QR code...</p>
                </div>
              ) : (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Roll Number</th>
                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Enrolled</th>
                        <th className="text-left p-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceRecords.map((r, i) => (
                        <tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-all">
                          <td className="p-4 text-sm text-gray-500">{i + 1}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
                                {r.name?.[0]?.toUpperCase() || '?'}
                              </div>
                              <span className="text-sm font-medium text-gray-200">{r.name}</span>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-mono text-gray-400">{r.rollNumber}</td>
                          <td className="p-4 text-sm text-gray-400">{r.email || '-'}</td>
                          <td className="p-4">
                            {r.isEnrolled ? (
                              <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 className="w-3.5 h-3.5" /> Yes</span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-amber-400"><AlertCircle className="w-3.5 h-3.5" /> No</span>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium">Present</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
