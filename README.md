# Smart Attendance System

A modern QR code-based attendance system for educational institutions. Faculty generate QR codes for attendance sessions, students scan to submit attendance via a mobile-friendly form, and the system automatically creates student records.

## Features

- **QR-Based Attendance**: Faculty generate QR codes that students scan to mark attendance
- **Mobile-Friendly Form**: Self-contained HTML form served directly from backend (no Vite needed for students)
- **Auto-Student Creation**: Students who submit attendance are automatically added to the system
- **Faculty Subject Assignment**: Faculty select which subjects they teach before generating QR codes
- **Real-Time Attendance Tracking**: View live submissions and attendance records per session
- **Dark Mode UI**: Modern, responsive dark-themed interface
- **Role-Based Access**: Admin, Faculty, and DEO dashboards with specific permissions

## Tech Stack

- **Backend**: Java 11+ (HttpServer), MongoDB, JWT Authentication
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
- **Database**: MongoDB 4.0+
- **QR Generation**: ZXing library

## Prerequisites

### System Requirements

- **Windows 10/11** (or Linux/macOS with Java)
- **Java 11+** (Eclipse Adoptium JDK 17 recommended)
- **Node.js 16+** (for frontend development)
- **MongoDB 4.0+** (local or Atlas)

### Installation

1. **Java Development Kit**
   - Download: [Eclipse Adoptium JDK 17](https://adoptium.net/)
   - Verify: `java -version` in terminal
   - Set `JAVA_HOME` environment variable to JDK installation path

2. **Node.js**
   - Download: [nodejs.org](https://nodejs.org/)
   - Verify: `node --version` and `npm --version`

3. **MongoDB**
   - **Option A (Local)**: [Download MongoDB Community](https://www.mongodb.com/try/download/community)
   - **Option B (Cloud)**: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)
   - Verify: `mongosh --version` or `mongo --version`

## Project Structure

```
college project/
├── backend/
│   ├── src/main/java/com/smartattendance/
│   │   ├── SimpleServer.java          (Main backend server, port 8080)
│   │   ├── config/MongoDBConnection.java
│   │   └── util/
│   │       ├── PasswordUtil.java
│   │       └── JwtUtil.java
│   ├── pom.xml                        (Maven dependencies)
│   └── target/                        (Compiled classes)
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── AdminDashboard.jsx
│   │   │   ├── FacultyDashboard.jsx
│   │   │   ├── DeoDashboard.jsx
│   │   │   └── AttendanceForm.jsx
│   │   ├── api/apiClient.js           (API client with axios)
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── index.html
├── database/
│   └── init-mongodb.js                (Database initialization script)
└── README.md
```

## Setup Instructions

### Step 1: Start MongoDB

**If using MongoDB locally:**

```bash
# Windows - Start MongoDB service
net start MongoDB

# Or run mongod manually
mongod --dbpath "C:\data\db"
```

**If using MongoDB Atlas (Cloud):**
- Create a cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
- Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/smart_attendance`
- Update in `backend/src/main/java/com/smartattendance/config/MongoDBConnection.java`

### Step 2: Initialize Database

```bash
cd database

# Run initialization script
node init-mongodb.js
```

This creates:
- Database: `smart_attendance`
- Collections: `users`, `departments`, `subjects`, `students`, `notifications`, `attendance_sessions`, `attendance_records`, `faculty_subjects`
- Default admin user: `admin` / `admin123`

### Step 3: Build Backend

```bash
cd backend

# Compile and download dependencies
mvn clean compile dependency:copy-dependencies
```

### Step 4: Start Backend Server

```bash
# From backend directory
java -cp "target/classes;target/dependency/*" com.smartattendance.SimpleServer
```

**Expected output:**
```
=== Smart Attendance System Backend ===
Server started on http://0.0.0.0:8080
LAN IP detected: 192.168.x.x
QR codes will use: http://192.168.x.x:8080/attend/...
Database: smart_attendance
```

### Step 5: Setup Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Expected output:**
```
VITE v4.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: http://192.168.x.x:5173/
```

### Step 6: Allow Firewall Access (Windows)

**Open PowerShell as Administrator** and run:

```powershell
New-NetFirewallRule -DisplayName "Smart Attendance Backend" -Direction Inbound -LocalPort 8080 -Protocol TCP -Action Allow
```

This allows phones on the same WiFi to access the attendance form.

### Step 7: Access the Application

Open browser and go to: **http://localhost:5173**

Login with:
- **Username**: `admin`
- **Password**: `admin123`

## Usage

### Login Credentials

| Role | Username | Password | Purpose |
|------|----------|----------|---------|
| Admin | `admin` | `admin123` | Manage users, departments, subjects, view all data |
| Faculty | `testfaculty` | `test123` | Create QR codes, view attendance records |
| DEO | `testdeo` | `test123` | Manage student records |

### Faculty Workflow

1. **Login**: Go to `http://localhost:5173` → Login as faculty
2. **Assign Subjects**: 
   - Click **My Subjects** in sidebar
   - Click **Add a Subject** dropdown
   - Select subjects you teach → Click **Add**
3. **Generate QR Code**:
   - Click **Create QR** in sidebar
   - Select a subject from your assigned subjects
   - Click **Generate QR**
   - QR code appears with attendance URL
4. **Share with Students**:
   - Students scan the QR with their phone camera
   - Opens attendance form at `http://YOUR_LAN_IP:8080/attend/<sessionId>`
5. **View Submissions**:
   - Click **View Live Submissions** to see real-time attendance
   - Click **My Sessions** to view all past sessions

### Student Workflow

1. **Scan QR Code**: Use phone camera to scan QR code shared by faculty
2. **Fill Attendance Form**:
   - Enter full name
   - Enter roll number (e.g., 21CSE001)
   - Enter email (optional)
   - Click **Submit Attendance**
3. **Confirmation**: See success message with submitted details
4. **Auto-Registration**: If roll number doesn't exist, student is automatically created in the system

### Admin Workflow

1. **Login**: Go to `http://localhost:5173` → Login as admin
2. **Dashboard**: View system statistics and recent activity
3. **Manage Users**: Create/delete faculty and DEO users
4. **Manage Departments**: Create/delete departments
5. **Manage Subjects**: Create/delete subjects and assign to departments
6. **Manage Students**: View auto-created students from attendance submissions
7. **View Notifications**: See system activity log

## API Endpoints

### Authentication
- `POST /auth/login` - Login with username/password

### Users
- `GET /users` - Get all users
- `POST /users` - Create new user
- `DELETE /users/:id` - Delete user

### Departments
- `GET /departments` - Get all departments
- `POST /departments` - Create department
- `DELETE /departments/:id` - Delete department

### Subjects
- `GET /subjects` - Get all subjects
- `POST /subjects` - Create subject
- `DELETE /subjects/:id` - Delete subject

### Students
- `GET /students` - Get all students
- `POST /students` - Create student
- `DELETE /students/:id` - Delete student

### Faculty-Subject Assignment
- `GET /faculty/subjects/:facultyId` - Get faculty's assigned subjects
- `POST /faculty/subjects` - Assign subjects to faculty

### Attendance
- `POST /attendance/sessions` - Create attendance session (generates QR)
- `GET /attendance/sessions?facultyId=x` - Get faculty's sessions
- `GET /attend/:sessionId` - Serve attendance form (HTML page)
- `POST /attendance/submit` - Submit attendance
- `GET /attendance/records/:sessionId` - Get attendance records for session

### Dashboard
- `GET /dashboard` - Get dashboard statistics

## Database Schema

### Users Collection
```json
{
  "_id": ObjectId,
  "username": "string",
  "passwordHash": "string",
  "name": "string",
  "role": "admin|faculty|deo",
  "createdAt": Date
}
```

### Students Collection
```json
{
  "_id": ObjectId,
  "name": "string",
  "rollNumber": "string",
  "email": "string",
  "departmentId": ObjectId,
  "semester": number,
  "section": "string",
  "createdAt": Date
}
```

### Attendance Sessions Collection
```json
{
  "_id": ObjectId,
  "sessionCode": "string",
  "facultyId": ObjectId,
  "facultyName": "string",
  "subjectId": ObjectId,
  "subjectName": "string",
  "subjectCode": "string",
  "departmentName": "string",
  "isActive": boolean,
  "expiresAt": Date,
  "createdAt": Date
}
```

### Attendance Records Collection
```json
{
  "_id": ObjectId,
  "sessionId": ObjectId,
  "rollNumber": "string",
  "name": "string",
  "email": "string",
  "isEnrolled": boolean,
  "subjectName": "string",
  "subjectCode": "string",
  "facultyName": "string",
  "submittedAt": Date
}
```

### Faculty Subjects Collection
```json
{
  "_id": ObjectId,
  "facultyId": ObjectId,
  "subjectId": ObjectId,
  "subjectName": "string",
  "subjectCode": "string",
  "departmentName": "string",
  "createdAt": Date
}
```

## Troubleshooting

### Backend Won't Start
- **Error**: `Port 8080 already in use`
  - Solution: Kill process on port 8080: `netstat -ano | findstr :8080` then `taskkill /PID <PID> /F`
- **Error**: `MongoDB connection failed`
  - Solution: Ensure MongoDB is running: `net start MongoDB` (Windows)

### Frontend Won't Load
- **Error**: `npm: command not found`
  - Solution: Install Node.js from [nodejs.org](https://nodejs.org/)
- **Error**: `Port 5173 already in use`
  - Solution: Kill process: `netstat -ano | findstr :5173` then `taskkill /PID <PID> /F`

### QR Code Not Scanning on Phone
- **Issue**: Phone can't reach the attendance form
  - Solution 1: Ensure phone is on same WiFi as computer
  - Solution 2: Allow port 8080 through Windows Firewall (see Setup step 6)
  - Solution 3: Check LAN IP in backend startup log and verify it's accessible from phone

### Students Not Auto-Creating
- **Issue**: Student submitted attendance but not appearing in Students list
  - Solution: Check backend logs for errors, ensure MongoDB is running and connected

## Development Notes

### Modifying Backend
- Backend code: `backend/src/main/java/com/smartattendance/`
- Rebuild: `mvn clean compile dependency:copy-dependencies`
- Restart server to apply changes

### Modifying Frontend
- Frontend code: `frontend/src/`
- Changes auto-reload in development mode (Vite HMR)
- No rebuild needed

### Adding New API Endpoints
1. Add route in `SimpleServer.java` (MainHandler.handle method)
2. Create handler method (e.g., `handleMyNewEndpoint`)
3. Rebuild backend and restart

## Performance & Security Notes

- **JWT Tokens**: Valid for 24 hours, stored in localStorage
- **Password Hashing**: Uses BCrypt with salt
- **CORS**: Enabled for development (localhost:5173 and 0.0.0.0)
- **Session Expiry**: Attendance sessions expire after 10 minutes
- **Duplicate Prevention**: Students can't submit attendance twice for same session

## Future Enhancements

- [ ] Email notifications for attendance
- [ ] Bulk student import (CSV)
- [ ] Attendance reports and analytics
- [ ] Mobile app (React Native)
- [ ] Biometric authentication
- [ ] Integration with college ERP

## Support

For issues or questions:
1. Check the **Troubleshooting** section above
2. Verify all prerequisites are installed
3. Check backend logs for error messages
4. Ensure MongoDB is running and connected

## License

This project is for educational purposes.

---

**Last Updated**: April 9, 2026
**Version**: 1.0
