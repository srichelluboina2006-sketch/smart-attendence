# Quick Setup Guide for Smart Attendance System

## Prerequisites Check

Before running the project, ensure you have:
- ✅ Java 11+ (You have Java 17 installed)
- ✅ Node.js 16+ (You have Node.js 18 installed)
- ⚠️ MongoDB (Not detected - see options below)

## MongoDB Setup Options

### Option 1: Use MongoDB Atlas (Cloud - Recommended for Quick Start)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a free account and cluster
3. Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
4. Update `backend/src/main/java/com/smartattendance/config/MongoDBConnection.java`:
   - Replace `mongodb://localhost:27017` with your Atlas connection string

### Option 2: Install MongoDB Locally

**Windows Installation:**
```powershell
# Download MongoDB Community Server from:
# https://www.mongodb.com/try/download/community

# After installation, start MongoDB:
net start MongoDB

# Or run manually:
mongod --dbpath "C:\data\db"
```

## Running the Project

### Step 1: Initialize Database

```bash
cd database
npm install mongodb
node init-mongodb.js
```

### Step 2: Start Backend

```bash
cd backend
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
java -cp "target/classes;target/dependency/*" com.smartattendance.SimpleServer
```

### Step 3: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### Step 4: Access Application

Open browser: http://localhost:5173
Login: admin / admin123

## Troubleshooting

**MongoDB Connection Failed:**
- Ensure MongoDB is running (local) or connection string is correct (Atlas)
- Check firewall settings
- Verify network connectivity

**Port Already in Use:**
- Backend (8080): `netstat -ano | findstr :8080` then `taskkill /PID <PID> /F`
- Frontend (5173): `netstat -ano | findstr :5173` then `taskkill /PID <PID> /F`
