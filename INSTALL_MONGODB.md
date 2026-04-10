# MongoDB Installation Guide

## Option 1: Using Docker (Recommended - Easiest)

### Install Docker Desktop
1. Download Docker Desktop for Windows: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. In the project root directory, run:
   ```powershell
   docker-compose up -d
   ```
4. MongoDB will be running on `localhost:27017`

### Stop MongoDB
```powershell
docker-compose down
```

## Option 2: Install MongoDB Community Edition

### Download and Install
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - Version: 7.0.x (Current)
   - Platform: Windows
   - Package: MSI
3. Download and run the installer
4. During installation:
   - Choose "Complete" installation
   - Install MongoDB as a Service (recommended)
   - Install MongoDB Compass (optional GUI tool)

### Start MongoDB Service
```powershell
# Start MongoDB service
net start MongoDB

# Check if MongoDB is running
Get-Service MongoDB
```

### Stop MongoDB Service
```powershell
net stop MongoDB
```

## Option 3: MongoDB Atlas (Cloud - Free Tier)

1. Create account at: https://www.mongodb.com/cloud/atlas/register
2. Create a free M0 cluster
3. Create database user with username and password
4. Whitelist your IP address (or use 0.0.0.0/0 for testing)
5. Get connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/`)
6. Set environment variable:
   ```powershell
   $env:MONGODB_URI = "your-connection-string"
   ```

## Verify MongoDB is Running

### Test Connection
```powershell
# Install MongoDB Shell (mongosh)
# Download from: https://www.mongodb.com/try/download/shell

# Connect to MongoDB
mongosh mongodb://localhost:27017

# You should see MongoDB shell prompt
```

## Next Steps

After MongoDB is running:

1. Initialize the database:
   ```powershell
   cd database
   node init-mongodb.js
   ```

2. Start the backend:
   ```powershell
   cd backend
   $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.16.8-hotspot"
   java -cp "target/classes;target/dependency/*" com.smartattendance.SimpleServer
   ```

3. Start the frontend:
   ```powershell
   cd frontend
   npm run dev
   ```
