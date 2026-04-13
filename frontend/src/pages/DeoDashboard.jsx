import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { deoAPI } from '../api/apiClient'
import { LogOut, Users, FileText, BarChart3, Calendar } from 'lucide-react'

export default function DeoDashboard({ user, onLogout }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState([])
  const [attendance, setAttendance] = useState([])
  const [exams, setExams] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', regno: '', email: '', phone: '', departmentId: '', year: 1, section: 'A', semester: '1' })
  const [newMarks, setNewMarks] = useState({ studentId: '', subjectId: '', marksType: 'internal', marksObtained: '' })
  const [newAttendance, setNewAttendance] = useState({ studentId: '', subjectId: '', date: '', status: 'present' })
  const [newExam, setNewExam] = useState({ subjectId: '', examDate: '', startTime: '', endTime: '', room: '', examType: 'internal' })

  useEffect(() => {
    if (activeTab === 'dashboard') fetchStats()
    else if (activeTab === 'students') fetchStudents()
    else if (activeTab === 'marks') fetchMarks()
    else if (activeTab === 'attendance') fetchAttendance()
    else if (activeTab === 'exam') fetchExams()
  }, [activeTab])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await deoAPI.getReports()
      setStats(response.data.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const response = await deoAPI.getStudents()
      setStudents(response.data.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchMarks = async () => {
    setLoading(true)
    try {
      const response = await deoAPI.getMarks()
      setMarks(response.data.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const response = await deoAPI.getAttendance()
      setAttendance(response.data.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchExams = async () => {
    setLoading(true)
    try {
      const response = await deoAPI.getExamSchedules()
      setExams(response.data.data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    try {
      await deoAPI.addStudent(newStudent)
      setNewStudent({ name: '', regno: '', email: '', phone: '', departmentId: '', year: 1, section: 'A', semester: '1' })
      fetchStudents()
      alert('Student added successfully')
    } catch (err) {
      alert('Error: ' + err.response?.data?.message)
    }
  }

  const handleAddMarks = async (e) => {
    e.preventDefault()
    try {
      await deoAPI.addMarks(newMarks)
      setNewMarks({ studentId: '', subjectId: '', marksType: 'internal', marksObtained: '' })
      fetchMarks()
      alert('Marks entry added successfully')
    } catch (err) {
      alert('Error: ' + err.response?.data?.message)
    }
  }

  const handleUploadAttendance = async (e) => {
    e.preventDefault()
    try {
      await deoAPI.uploadAttendance(newAttendance)
      setNewAttendance({ studentId: '', subjectId: '', date: '', status: 'present' })
      fetchAttendance()
      alert('Attendance uploaded successfully')
    } catch (err) {
      alert('Error: ' + err.response?.data?.message)
    }
  }

  const handleCreateExam = async (e) => {
    e.preventDefault()
    try {
      await deoAPI.createExamSchedule(newExam)
      setNewExam({ subjectId: '', examDate: '', startTime: '', endTime: '', room: '', examType: 'internal' })
      fetchExams()
      alert('Exam schedule created successfully')
    } catch (err) {
      alert('Error: ' + err.response?.data?.message)
    }
  }

  const handleLogout = () => {
    if (onLogout) onLogout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-64 bg-gray-900 text-white p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-8">DEO Portal</h1>
        <nav className="space-y-4">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-4 py-2 rounded ${activeTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
            <BarChart3 className="inline mr-2 w-4 h-4" /> Dashboard
          </button>
          <button onClick={() => setActiveTab('students')} className={`w-full text-left px-4 py-2 rounded ${activeTab === 'students' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
            <Users className="inline mr-2 w-4 h-4" /> Students
          </button>
          <button onClick={() => setActiveTab('marks')} className={`w-full text-left px-4 py-2 rounded ${activeTab === 'marks' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
            <FileText className="inline mr-2 w-4 h-4" /> Marks
          </button>
          <button onClick={() => setActiveTab('attendance')} className={`w-full text-left px-4 py-2 rounded ${activeTab === 'attendance' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
            <FileText className="inline mr-2 w-4 h-4" /> Attendance
          </button>
          <button onClick={() => setActiveTab('exam')} className={`w-full text-left px-4 py-2 rounded ${activeTab === 'exam' ? 'bg-blue-600' : 'hover:bg-gray-800'}`}>
            <Calendar className="inline mr-2 w-4 h-4" /> Exam Schedule
          </button>
        </nav>
        <button onClick={handleLogout} className="w-full mt-8 px-4 py-2 bg-red-600 rounded hover:bg-red-700 flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">Welcome, {user.name}!</h2>

          {activeTab === 'dashboard' && stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-medium">Total Students</h3>
                <p className="text-3xl font-bold text-blue-600">{stats.totalStudents}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-medium">Marks Entries</h3>
                <p className="text-3xl font-bold text-green-600">{stats.totalMarksEntries}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-medium">Attendance Records</h3>
                <p className="text-3xl font-bold text-purple-600">{stats.totalAttendanceRecords}</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-gray-600 text-sm font-medium">Exam Schedules</h3>
                <p className="text-3xl font-bold text-orange-600">{stats.totalExamSchedules}</p>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Student Data Entry</h3>
              <form onSubmit={handleAddStudent} className="mb-6 p-4 bg-gray-50 rounded">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <input type="text" placeholder="Name" value={newStudent.name} onChange={(e) => setNewStudent({...newStudent, name: e.target.value})} className="input-field" required />
                  <input type="text" placeholder="Reg No" value={newStudent.regno} onChange={(e) => setNewStudent({...newStudent, regno: e.target.value})} className="input-field" required />
                  <input type="email" placeholder="Email" value={newStudent.email} onChange={(e) => setNewStudent({...newStudent, email: e.target.value})} className="input-field" />
                  <input type="text" placeholder="Phone" value={newStudent.phone} onChange={(e) => setNewStudent({...newStudent, phone: e.target.value})} className="input-field" />
                  <input type="number" placeholder="Year" value={newStudent.year} onChange={(e) => setNewStudent({...newStudent, year: e.target.value})} className="input-field" />
                  <input type="text" placeholder="Section" value={newStudent.section} onChange={(e) => setNewStudent({...newStudent, section: e.target.value})} className="input-field" />
                  <input type="text" placeholder="Semester" value={newStudent.semester} onChange={(e) => setNewStudent({...newStudent, semester: e.target.value})} className="input-field" />
                  <input type="number" placeholder="Dept ID" value={newStudent.departmentId} onChange={(e) => setNewStudent({...newStudent, departmentId: e.target.value})} className="input-field" />
                </div>
                <button type="submit" className="btn-primary">Add Student</button>
              </form>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Reg No</th>
                      <th className="p-3 text-left">Email</th>
                      <th className="p-3 text-left">Year</th>
                      <th className="p-3 text-left">Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map(s => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{s.name}</td>
                        <td className="p-3">{s.regno}</td>
                        <td className="p-3">{s.email}</td>
                        <td className="p-3">{s.year}</td>
                        <td className="p-3">{s.section}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'marks' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Marks Data Entry</h3>
              <form onSubmit={handleAddMarks} className="mb-6 p-4 bg-gray-50 rounded">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <input type="number" placeholder="Student ID" value={newMarks.studentId} onChange={(e) => setNewMarks({...newMarks, studentId: e.target.value})} className="input-field" required />
                  <input type="number" placeholder="Subject ID" value={newMarks.subjectId} onChange={(e) => setNewMarks({...newMarks, subjectId: e.target.value})} className="input-field" required />
                  <select value={newMarks.marksType} onChange={(e) => setNewMarks({...newMarks, marksType: e.target.value})} className="input-field">
                    <option value="internal">Internal</option>
                    <option value="assignment">Assignment</option>
                    <option value="lab">Lab</option>
                    <option value="external">External</option>
                  </select>
                  <input type="number" placeholder="Marks" value={newMarks.marksObtained} onChange={(e) => setNewMarks({...newMarks, marksObtained: e.target.value})} className="input-field" required />
                </div>
                <button type="submit" className="btn-primary">Add Marks Entry</button>
              </form>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">Student</th>
                      <th className="p-3 text-left">Subject</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marks.map(m => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{m.studentName}</td>
                        <td className="p-3">{m.subjectName}</td>
                        <td className="p-3">{m.marksType}</td>
                        <td className="p-3">{m.marksObtained}/{m.maxMarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Attendance Upload</h3>
              <form onSubmit={handleUploadAttendance} className="mb-6 p-4 bg-gray-50 rounded">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <input type="number" placeholder="Student ID" value={newAttendance.studentId} onChange={(e) => setNewAttendance({...newAttendance, studentId: e.target.value})} className="input-field" required />
                  <input type="number" placeholder="Subject ID" value={newAttendance.subjectId} onChange={(e) => setNewAttendance({...newAttendance, subjectId: e.target.value})} className="input-field" required />
                  <input type="date" value={newAttendance.date} onChange={(e) => setNewAttendance({...newAttendance, date: e.target.value})} className="input-field" required />
                  <select value={newAttendance.status} onChange={(e) => setNewAttendance({...newAttendance, status: e.target.value})} className="input-field">
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">Upload Attendance</button>
              </form>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Student</th>
                      <th className="p-3 text-left">Subject</th>
                      <th className="p-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map(a => (
                      <tr key={a.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{a.date}</td>
                        <td className="p-3">{a.studentName}</td>
                        <td className="p-3">{a.subjectName}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded text-xs ${a.status === 'present' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{a.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'exam' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Exam Schedule Management</h3>
              <form onSubmit={handleCreateExam} className="mb-6 p-4 bg-gray-50 rounded">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <input type="number" placeholder="Subject ID" value={newExam.subjectId} onChange={(e) => setNewExam({...newExam, subjectId: e.target.value})} className="input-field" required />
                  <input type="date" value={newExam.examDate} onChange={(e) => setNewExam({...newExam, examDate: e.target.value})} className="input-field" required />
                  <input type="time" value={newExam.startTime} onChange={(e) => setNewExam({...newExam, startTime: e.target.value})} className="input-field" required />
                  <input type="time" value={newExam.endTime} onChange={(e) => setNewExam({...newExam, endTime: e.target.value})} className="input-field" required />
                  <input type="text" placeholder="Room" value={newExam.room} onChange={(e) => setNewExam({...newExam, room: e.target.value})} className="input-field" />
                  <select value={newExam.examType} onChange={(e) => setNewExam({...newExam, examType: e.target.value})} className="input-field">
                    <option value="internal">Internal</option>
                    <option value="external">External</option>
                    <option value="lab">Lab</option>
                  </select>
                </div>
                <button type="submit" className="btn-primary">Create Exam Schedule</button>
              </form>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="p-3 text-left">Subject</th>
                      <th className="p-3 text-left">Date</th>
                      <th className="p-3 text-left">Time</th>
                      <th className="p-3 text-left">Room</th>
                      <th className="p-3 text-left">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.map(e => (
                      <tr key={e.id} className="border-b hover:bg-gray-50">
                        <td className="p-3">{e.subjectName}</td>
                        <td className="p-3">{e.examDate}</td>
                        <td className="p-3">{e.startTime} - {e.endTime}</td>
                        <td className="p-3">{e.room}</td>
                        <td className="p-3"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">{e.examType}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
