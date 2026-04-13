import axios from 'axios';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (username, password) => apiClient.post('/auth/login', { username, password }),
  register: (data) => apiClient.post('/auth/register', data),
  checkUsers: () => apiClient.get('/auth/check-users'),
};

export const adminAPI = {
  getDashboard: () => apiClient.get('/dashboard'),
  getUsers: () => apiClient.get('/users'),
  createUser: (data) => apiClient.post('/users', data),
  deleteUser: (id) => apiClient.delete(`/users/${id}`),
  getDepartments: () => apiClient.get('/departments'),
  createDepartment: (data) => apiClient.post('/departments', data),
  deleteDepartment: (id) => apiClient.delete(`/departments/${id}`),
  getSubjects: () => apiClient.get('/subjects'),
  createSubject: (data) => apiClient.post('/subjects', data),
  deleteSubject: (id) => apiClient.delete(`/subjects/${id}`),
  getStudents: () => apiClient.get('/students'),
  createStudent: (data) => apiClient.post('/students', data),
  deleteStudent: (id) => apiClient.delete(`/students/${id}`),
  getNotifications: () => apiClient.get('/notifications'),
  sendNotification: (data) => apiClient.post('/notifications', data),
};

export const facultyAPI = {
  getProfile: () => apiClient.get('/faculty/profile'),
  getStudents: () => apiClient.get('/faculty/students'),
  generateQR: (data) => apiClient.post('/faculty/qr', data),
  markAttendance: (data) => apiClient.post('/faculty/attendance', data),
  getAttendance: () => apiClient.get('/faculty/attendance'),
  getAttendanceReport: (studentId) => apiClient.get(`/faculty/reports?studentId=${studentId}`),
  submitMarks: (data) => apiClient.post('/faculty/marks', data),
  getMarks: () => apiClient.get('/faculty/marks'),
  uploadResource: (data) => apiClient.post('/faculty/resources', data),
  getResources: () => apiClient.get('/faculty/resources'),
  getTimetable: () => apiClient.get('/faculty/timetable'),
};

export const attendanceAPI = {
  createSession: (data) => apiClient.post('/attendance/sessions', data),
  getSessions: (facultyId) => apiClient.get(`/attendance/sessions?facultyId=${facultyId}`),
  getSessionInfo: (sessionId) => apiClient.get(`/attendance/session/${sessionId}`),
  submitAttendance: (data) => apiClient.post('/attendance/submit', data),
  getRecords: (sessionId) => apiClient.get(`/attendance/records/${sessionId}`),
  getAllSubjects: () => apiClient.get('/subjects'),
  getFacultySubjects: (facultyId) => apiClient.get(`/faculty/subjects/${facultyId}`),
  assignFacultySubjects: (data) => apiClient.post('/faculty/subjects', data),
};

export const deoAPI = {
  getStudents: () => apiClient.get('/deo/students'),
  addStudent: (data) => apiClient.post('/deo/students', data),
  updateStudent: (id, data) => apiClient.put(`/deo/students/${id}`, data),
  getMarks: () => apiClient.get('/deo/marks'),
  addMarks: (data) => apiClient.post('/deo/marks', data),
  getAttendance: () => apiClient.get('/deo/attendance'),
  uploadAttendance: (data) => apiClient.post('/deo/attendance', data),
  getExamSchedules: () => apiClient.get('/deo/exam'),
  createExamSchedule: (data) => apiClient.post('/deo/exam', data),
  getReports: () => apiClient.get('/deo/reports'),
  verifyData: () => apiClient.get('/deo/verify'),
};

export default apiClient;
