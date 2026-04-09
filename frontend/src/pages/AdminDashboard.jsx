import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../api/apiClient'
import { LogOut, Users, Building2, BookOpen, BarChart3, Bell, GraduationCap, Trash2, Plus, RefreshCw, X } from 'lucide-react'

export default function AdminDashboard({ user }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState({ totalUsers: 0, totalStudents: 0, totalDepartments: 0, totalSubjects: 0, totalNotifications: 0, recentUsers: [] })
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [subjects, setSubjects] = useState([])
  const [students, setStudents] = useState([])
  const [notifications, setNotifications] = useState([])
  const [message, setMessage] = useState({ text: '', type: '' })
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)

  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', email: '', role: 'faculty' })
  const [newDept, setNewDept] = useState({ deptName: '', deptCode: '' })
  const [newSubject, setNewSubject] = useState({ subjectName: '', subjectCode: '', departmentId: '', semester: 1, credits: 3 })
  const [newStudent, setNewStudent] = useState({ name: '', rollNumber: '', email: '', departmentId: '', semester: 1, section: 'A' })
  const [newNotif, setNewNotif] = useState({ title: '', message: '', type: 'info', target: 'all' })

  useEffect(() => {
    loadTabData(activeTab)
    setShowForm(false)
  }, [activeTab])

  const showMsg = (text, type = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: '' }), 5000)
  }

  const loadTabData = async (tab) => {
    setLoading(true)
    try {
      if (tab === 'dashboard') {
        const res = await adminAPI.getDashboard()
        if (res.data.success) setStats(res.data.data)
      } else if (tab === 'users') {
        const res = await adminAPI.getUsers()
        if (res.data.success) setUsers(res.data.data || [])
      } else if (tab === 'departments') {
        const res = await adminAPI.getDepartments()
        if (res.data.success) setDepartments(res.data.data || [])
      } else if (tab === 'subjects') {
        const [subRes, deptRes] = await Promise.all([adminAPI.getSubjects(), adminAPI.getDepartments()])
        if (subRes.data.success) setSubjects(subRes.data.data || [])
        if (deptRes.data.success) setDepartments(deptRes.data.data || [])
      } else if (tab === 'students') {
        const [stuRes, deptRes] = await Promise.all([adminAPI.getStudents(), adminAPI.getDepartments()])
        if (stuRes.data.success) setStudents(stuRes.data.data || [])
        if (deptRes.data.success) setDepartments(deptRes.data.data || [])
      } else if (tab === 'notifications') {
        const res = await adminAPI.getNotifications()
        if (res.data.success) setNotifications(res.data.data || [])
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e, type) => {
    e.preventDefault()
    try {
      let res
      if (type === 'user') {
        res = await adminAPI.createUser(newUser)
        if (res.data.success) { setNewUser({ name: '', username: '', password: '', email: '', role: 'faculty' }); setShowForm(false) }
      } else if (type === 'dept') {
        res = await adminAPI.createDepartment(newDept)
        if (res.data.success) { setNewDept({ deptName: '', deptCode: '' }); setShowForm(false) }
      } else if (type === 'subject') {
        res = await adminAPI.createSubject(newSubject)
        if (res.data.success) { setNewSubject({ subjectName: '', subjectCode: '', departmentId: '', semester: 1, credits: 3 }); setShowForm(false) }
      } else if (type === 'student') {
        res = await adminAPI.createStudent(newStudent)
        if (res.data.success) { setNewStudent({ name: '', rollNumber: '', email: '', departmentId: '', semester: 1, section: 'A' }); setShowForm(false) }
      } else if (type === 'notification') {
        res = await adminAPI.sendNotification(newNotif)
        if (res.data.success) { setNewNotif({ title: '', message: '', type: 'info', target: 'all' }); setShowForm(false) }
      }
      showMsg(res.data.message || 'Created successfully!')
      loadTabData(activeTab)
    } catch (err) {
      showMsg(err.response?.data?.message || 'Operation failed', 'error')
    }
  }

  const handleDelete = async (type, id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return
    try {
      let res
      if (type === 'user') res = await adminAPI.deleteUser(id)
      else if (type === 'dept') res = await adminAPI.deleteDepartment(id)
      else if (type === 'subject') res = await adminAPI.deleteSubject(id)
      else if (type === 'student') res = await adminAPI.deleteStudent(id)
      showMsg(res.data.message || 'Deleted successfully!')
      loadTabData(activeTab)
    } catch (err) {
      showMsg(err.response?.data?.message || 'Delete failed', 'error')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'text-blue-500' },
    { id: 'users', label: 'Users', icon: Users, color: 'text-indigo-500' },
    { id: 'departments', label: 'Departments', icon: Building2, color: 'text-purple-500' },
    { id: 'subjects', label: 'Subjects', icon: BookOpen, color: 'text-amber-500' },
    { id: 'students', label: 'Students', icon: GraduationCap, color: 'text-green-500' },
    { id: 'notifications', label: 'Notifications', icon: Bell, color: 'text-pink-500' },
  ]

  const [hoveredUser, setHoveredUser] = useState(null)

  const inputClass = "w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder-gray-500 outline-none transition-all text-sm"
  const selectClass = "w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 outline-none transition-all text-sm"

  return (
    <div className="flex h-screen bg-gray-950">
      {/* Sidebar */}
      <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Smart Attendance</h1>
          <p className="text-xs text-gray-500 mt-0.5">Administration Panel</p>
        </div>
        <div className="p-3 border-b border-gray-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/20">
              {(user?.name || 'A')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-200 truncate">{user?.name || 'Admin'}</p>
              <p className="text-xs text-gray-500">{user?.role?.toUpperCase()}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-3 text-sm transition-all ${activeTab === tab.id ? 'bg-blue-600/20 text-blue-400 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}>
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-blue-400' : 'text-gray-600'}`} />
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-800">
          <button onClick={handleLogout} className="w-full px-4 py-2 text-red-400 bg-red-500/10 rounded-lg hover:bg-red-500/20 flex items-center justify-center gap-2 text-sm font-medium transition-colors">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">

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
              <h2 className="text-2xl font-bold text-gray-100 mb-1">Dashboard</h2>
              <p className="text-gray-500 text-sm mb-8">Overview of your Smart Attendance System</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
                {[
                  { label: 'Users', value: stats.totalUsers, icon: Users, gradient: 'from-blue-600 to-blue-500', shadow: 'shadow-blue-500/20', tab: 'users' },
                  { label: 'Students', value: stats.totalStudents, icon: GraduationCap, gradient: 'from-emerald-600 to-green-500', shadow: 'shadow-emerald-500/20', tab: 'students' },
                  { label: 'Departments', value: stats.totalDepartments, icon: Building2, gradient: 'from-purple-600 to-violet-500', shadow: 'shadow-purple-500/20', tab: 'departments' },
                  { label: 'Subjects', value: stats.totalSubjects, icon: BookOpen, gradient: 'from-amber-600 to-orange-500', shadow: 'shadow-amber-500/20', tab: 'subjects' },
                  { label: 'Notifications', value: stats.totalNotifications, icon: Bell, gradient: 'from-pink-600 to-rose-500', shadow: 'shadow-pink-500/20', tab: 'notifications' },
                ].map((card, i) => (
                  <div key={i} onClick={() => setActiveTab(card.tab)} className={`bg-gradient-to-br ${card.gradient} p-5 rounded-2xl text-white shadow-lg ${card.shadow} cursor-pointer hover:scale-105 hover:shadow-xl transition-all duration-200`}>
                    <card.icon className="w-8 h-8 opacity-80 mb-3" />
                    <p className="text-3xl font-bold">{card.value}</p>
                    <p className="text-sm opacity-80 mt-1">{card.label}</p>
                  </div>
                ))}
              </div>

              {stats.recentUsers && stats.recentUsers.length > 0 && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
                  <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Users</h3>
                  <div className="space-y-2">
                    {stats.recentUsers.map((u, i) => (
                      <div key={i} className="relative flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl hover:bg-gray-800 transition-all cursor-pointer group"
                        onMouseEnter={() => setHoveredUser(i)} onMouseLeave={() => setHoveredUser(null)}>
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${u.role === 'admin' ? 'from-red-500 to-orange-500' : u.role === 'faculty' ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-emerald-500'} flex items-center justify-center text-white text-sm font-bold`}>
                          {u.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-200">{u.name}</p>
                          <p className="text-xs text-gray-500">{u.role?.toUpperCase()}</p>
                        </div>
                        {/* Hover tooltip */}
                        {hoveredUser === i && (
                          <div className="absolute left-full ml-3 top-0 z-50 bg-gray-800 border border-gray-700 rounded-xl p-4 shadow-2xl shadow-black/50 min-w-[260px]">
                            <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-700">
                              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${u.role === 'admin' ? 'from-red-500 to-orange-500' : u.role === 'faculty' ? 'from-blue-500 to-cyan-500' : 'from-green-500 to-emerald-500'} flex items-center justify-center text-white font-bold`}>
                                {u.name?.[0]?.toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-100">{u.name}</p>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : u.role === 'faculty' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{u.role?.toUpperCase()}</span>
                              </div>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between"><span className="text-gray-500">Username</span><span className="text-gray-300 font-mono">{u.username || 'N/A'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-gray-300">{u.email || 'N/A'}</span></div>
                              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className={u.isActive ? 'text-emerald-400' : 'text-red-400'}>{u.isActive ? 'Active' : 'Inactive'}</span></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== USERS ========== */}
          {activeTab === 'users' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-100">Users</h2>
                  <p className="text-gray-500 text-sm">Manage faculty, DEO and admin accounts</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => loadTabData('users')} className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
                  <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-blue-600/20">
                    <Plus className="w-4 h-4" /> Add User
                  </button>
                </div>
              </div>

              {showForm && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
                  <h3 className="text-base font-semibold text-gray-200 mb-4">New User</h3>
                  <form onSubmit={e => handleCreate(e, 'user')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name *</label>
                        <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className={inputClass} placeholder="e.g. Dr. John Smith" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Username *</label>
                        <input type="text" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className={inputClass} placeholder="e.g. john.smith" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Password * (min 4 chars)</label>
                        <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className={inputClass} placeholder="Min 4 characters" required minLength={4} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                        <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className={inputClass} placeholder="e.g. john@college.edu" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Role *</label>
                        <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className={selectClass}>
                          <option value="faculty">Faculty</option>
                          <option value="deo">Data Entry Operator</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium transition-colors">Create User</button>
                      <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-300">All Users <span className="text-gray-600 font-normal">({users.length})</span></h3>
                </div>
                {users.length === 0 ? (
                  <div className="p-12 text-center"><Users className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No users found. Click "Add User" to create one.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Username</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Email</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Role</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {users.map((u, idx) => (
                          <tr key={u.id || idx} className="hover:bg-gray-800/50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">{u.name?.[0]?.toUpperCase()}</div>
                                <span className="font-medium text-gray-200">{u.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-gray-400 font-mono text-xs">{u.username}</td>
                            <td className="p-3 text-gray-400">{u.email}</td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${u.role === 'admin' ? 'bg-red-500/20 text-red-400' : u.role === 'faculty' ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                {u.role?.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-3">
                              <button onClick={() => handleDelete('user', u.id, u.name)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== DEPARTMENTS ========== */}
          {activeTab === 'departments' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div><h2 className="text-2xl font-bold text-gray-100">Departments</h2><p className="text-gray-500 text-sm">Manage academic departments</p></div>
                <div className="flex gap-2">
                  <button onClick={() => loadTabData('departments')} className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
                  <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-purple-600/20">
                    <Plus className="w-4 h-4" /> Add Department
                  </button>
                </div>
              </div>

              {showForm && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
                  <h3 className="text-base font-semibold text-gray-200 mb-4">New Department</h3>
                  <form onSubmit={e => handleCreate(e, 'dept')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Department Name *</label>
                        <input type="text" value={newDept.deptName} onChange={e => setNewDept({...newDept, deptName: e.target.value})} className={inputClass} placeholder="e.g. Computer Science & Engineering" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Department Code *</label>
                        <input type="text" value={newDept.deptCode} onChange={e => setNewDept({...newDept, deptCode: e.target.value})} className={inputClass} placeholder="e.g. CSE" required />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-500 text-sm font-medium transition-colors">Create Department</button>
                      <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {departments.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center"><Building2 className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No departments found. Click "Add Department" to create one.</p></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.map((d, idx) => (
                    <div key={d.id || idx} className="bg-gray-900 rounded-2xl border border-gray-800 p-5 hover:border-gray-700 transition-all group">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-600/20">{d.deptCode?.[0]}</div>
                          <div>
                            <h4 className="font-semibold text-gray-200">{d.deptName}</h4>
                            <p className="text-xs font-mono text-gray-500 mt-0.5">{d.deptCode}</p>
                          </div>
                        </div>
                        <button onClick={() => handleDelete('dept', d.id, d.deptName)} className="p-1.5 text-gray-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                      </div>
                      <div className="mt-4 flex gap-4 text-xs text-gray-500">
                        <span>{d.subjectCount || 0} subjects</span>
                        <span>{d.studentCount || 0} students</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========== SUBJECTS ========== */}
          {activeTab === 'subjects' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div><h2 className="text-2xl font-bold text-gray-100">Subjects</h2><p className="text-gray-500 text-sm">Manage course subjects</p></div>
                <div className="flex gap-2">
                  <button onClick={() => loadTabData('subjects')} className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
                  <button onClick={() => setShowForm(!showForm)} disabled={departments.length === 0} className="px-4 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-500 flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-amber-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-4 h-4" /> Add Subject
                  </button>
                </div>
              </div>

              {departments.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-amber-400 text-sm">Please create a department first before adding subjects.</div>
              )}

              {showForm && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
                  <h3 className="text-base font-semibold text-gray-200 mb-4">New Subject</h3>
                  <form onSubmit={e => handleCreate(e, 'subject')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject Name *</label>
                        <input type="text" value={newSubject.subjectName} onChange={e => setNewSubject({...newSubject, subjectName: e.target.value})} className={inputClass} placeholder="e.g. Data Structures" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Subject Code *</label>
                        <input type="text" value={newSubject.subjectCode} onChange={e => setNewSubject({...newSubject, subjectCode: e.target.value})} className={inputClass} placeholder="e.g. CS201" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Department *</label>
                        <select value={newSubject.departmentId} onChange={e => setNewSubject({...newSubject, departmentId: e.target.value})} className={selectClass} required>
                          <option value="">-- Select --</option>
                          {departments.map((d, idx) => <option key={d.id || idx} value={d.id}>{d.deptName} ({d.deptCode})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Semester</label>
                        <select value={newSubject.semester} onChange={e => setNewSubject({...newSubject, semester: parseInt(e.target.value)})} className={selectClass}>
                          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Credits</label>
                        <select value={newSubject.credits} onChange={e => setNewSubject({...newSubject, credits: parseInt(e.target.value)})} className={selectClass}>
                          {[1,2,3,4,5,6].map(c => <option key={c} value={c}>{c} Credits</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-500 text-sm font-medium transition-colors">Create Subject</button>
                      <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800"><h3 className="font-semibold text-gray-300">All Subjects <span className="text-gray-600 font-normal">({subjects.length})</span></h3></div>
                {subjects.length === 0 ? (
                  <div className="p-12 text-center"><BookOpen className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No subjects found.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Subject</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Code</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Department</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Sem</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Credits</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {subjects.map((s, idx) => (
                          <tr key={s.id || idx} className="hover:bg-gray-800/50 transition-colors">
                            <td className="p-3 font-medium text-gray-200">{s.subjectName}</td>
                            <td className="p-3"><span className="font-mono bg-gray-800 px-2 py-1 rounded text-xs text-amber-400">{s.subjectCode}</span></td>
                            <td className="p-3 text-gray-400">{s.departmentName || 'N/A'}</td>
                            <td className="p-3 text-gray-400">{s.semester || '-'}</td>
                            <td className="p-3 text-gray-400">{s.credits || '-'}</td>
                            <td className="p-3"><button onClick={() => handleDelete('subject', s.id, s.subjectName)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== STUDENTS ========== */}
          {activeTab === 'students' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div><h2 className="text-2xl font-bold text-gray-100">Students</h2><p className="text-gray-500 text-sm">Manage student enrollment</p></div>
                <div className="flex gap-2">
                  <button onClick={() => loadTabData('students')} className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
                  <button onClick={() => setShowForm(!showForm)} disabled={departments.length === 0} className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-4 h-4" /> Enroll Student
                  </button>
                </div>
              </div>

              {departments.length === 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 text-amber-400 text-sm">Create a department first before enrolling students.</div>
              )}

              {showForm && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
                  <h3 className="text-base font-semibold text-gray-200 mb-4">Enroll New Student</h3>
                  <form onSubmit={e => handleCreate(e, 'student')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Full Name *</label>
                        <input type="text" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} className={inputClass} placeholder="e.g. Ravi Kumar" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Roll Number *</label>
                        <input type="text" value={newStudent.rollNumber} onChange={e => setNewStudent({...newStudent, rollNumber: e.target.value})} className={inputClass} placeholder="e.g. 21CSE101" required />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Email</label>
                        <input type="email" value={newStudent.email} onChange={e => setNewStudent({...newStudent, email: e.target.value})} className={inputClass} placeholder="e.g. ravi@college.edu" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Department *</label>
                        <select value={newStudent.departmentId} onChange={e => setNewStudent({...newStudent, departmentId: e.target.value})} className={selectClass} required>
                          <option value="">-- Select --</option>
                          {departments.map((d, idx) => <option key={d.id || idx} value={d.id}>{d.deptName} ({d.deptCode})</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Semester</label>
                        <select value={newStudent.semester} onChange={e => setNewStudent({...newStudent, semester: parseInt(e.target.value)})} className={selectClass}>
                          {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Section</label>
                        <select value={newStudent.section} onChange={e => setNewStudent({...newStudent, section: e.target.value})} className={selectClass}>
                          {['A','B','C','D'].map(s => <option key={s} value={s}>Section {s}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 text-sm font-medium transition-colors">Enroll Student</button>
                      <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                <div className="p-4 border-b border-gray-800"><h3 className="font-semibold text-gray-300">All Students <span className="text-gray-600 font-normal">({students.length})</span></h3></div>
                {students.length === 0 ? (
                  <div className="p-12 text-center"><GraduationCap className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No students enrolled yet.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-800/50">
                        <tr>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Name</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Roll No.</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Department</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Sem</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Sec</th>
                          <th className="p-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {students.map((s, idx) => (
                          <tr key={s.id || idx} className="hover:bg-gray-800/50 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-xs font-bold">{s.name?.[0]?.toUpperCase()}</div>
                                <div><p className="font-medium text-gray-200">{s.name}</p>{s.email && <p className="text-xs text-gray-500">{s.email}</p>}</div>
                              </div>
                            </td>
                            <td className="p-3"><span className="font-mono bg-gray-800 px-2 py-1 rounded text-xs text-emerald-400">{s.rollNumber}</span></td>
                            <td className="p-3 text-gray-400">{s.departmentName || 'N/A'}</td>
                            <td className="p-3 text-gray-400">{s.semester}</td>
                            <td className="p-3 text-gray-400">{s.section}</td>
                            <td className="p-3"><button onClick={() => handleDelete('student', s.id, s.name)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========== NOTIFICATIONS ========== */}
          {activeTab === 'notifications' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div><h2 className="text-2xl font-bold text-gray-100">Notifications</h2><p className="text-gray-500 text-sm">Send announcements and alerts</p></div>
                <div className="flex gap-2">
                  <button onClick={() => loadTabData('notifications')} className="p-2.5 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors"><RefreshCw className="w-4 h-4 text-gray-400" /></button>
                  <button onClick={() => setShowForm(!showForm)} className="px-4 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-500 flex items-center gap-2 text-sm font-medium transition-colors shadow-lg shadow-pink-600/20">
                    <Plus className="w-4 h-4" /> Send Notification
                  </button>
                </div>
              </div>

              {showForm && (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6 mb-6">
                  <h3 className="text-base font-semibold text-gray-200 mb-4">New Notification</h3>
                  <form onSubmit={e => handleCreate(e, 'notification')}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Title *</label>
                        <input type="text" value={newNotif.title} onChange={e => setNewNotif({...newNotif, title: e.target.value})} className={inputClass} placeholder="e.g. Exam Schedule Updated" required />
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-400 mb-1.5">Type</label>
                          <select value={newNotif.type} onChange={e => setNewNotif({...newNotif, type: e.target.value})} className={selectClass}>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="urgent">Urgent</option>
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-400 mb-1.5">Target</label>
                          <select value={newNotif.target} onChange={e => setNewNotif({...newNotif, target: e.target.value})} className={selectClass}>
                            <option value="all">Everyone</option>
                            <option value="faculty">Faculty Only</option>
                            <option value="students">Students Only</option>
                          </select>
                        </div>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-400 mb-1.5">Message *</label>
                        <textarea value={newNotif.message} onChange={e => setNewNotif({...newNotif, message: e.target.value})} className={inputClass + " resize-none"} rows={3} placeholder="Type your notification message here..." required />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" className="px-5 py-2.5 bg-pink-600 text-white rounded-lg hover:bg-pink-500 text-sm font-medium transition-colors">Send Notification</button>
                      <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 bg-gray-800 text-gray-400 rounded-lg hover:bg-gray-700 text-sm font-medium transition-colors">Cancel</button>
                    </div>
                  </form>
                </div>
              )}

              {notifications.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl border border-gray-800 p-12 text-center"><Bell className="w-12 h-12 text-gray-700 mx-auto mb-3" /><p className="text-gray-500">No notifications sent yet.</p></div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((n, idx) => (
                    <div key={n.id || idx} className={`bg-gray-900 rounded-2xl border p-5 ${n.type === 'urgent' ? 'border-red-500/30 bg-red-500/5' : n.type === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-gray-800'}`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className={`w-2 h-2 rounded-full mt-2 ${n.type === 'urgent' ? 'bg-red-500' : n.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          <div>
                            <h4 className="font-semibold text-gray-200">{n.title}</h4>
                            <p className="text-sm text-gray-400 mt-1">{n.message}</p>
                            <div className="flex gap-3 mt-2 text-xs text-gray-500">
                              <span className={`px-2 py-0.5 rounded-full ${n.type === 'urgent' ? 'bg-red-500/20 text-red-400' : n.type === 'warning' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{n.type}</span>
                              <span>To: {n.target}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
