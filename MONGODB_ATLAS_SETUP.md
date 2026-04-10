# MongoDB Atlas Setup Instructions

Since MongoDB is not installed locally, we'll use MongoDB Atlas (free cloud database).

## Step 1: Create MongoDB Atlas Account

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for a free account
3. Create a free M0 cluster (512MB storage, free forever)

## Step 2: Configure Database Access

1. In Atlas dashboard, go to **Database Access**
2. Click **Add New Database User**
3. Create a user:
   - Username: `smartattendance`
   - Password: Generate a secure password (save it!)
   - Database User Privileges: **Read and write to any database**

## Step 3: Configure Network Access

1. Go to **Network Access**
2. Click **Add IP Address**
3. Click **Allow Access from Anywhere** (0.0.0.0/0)
   - For production, restrict to specific IPs

## Step 4: Get Connection String

1. Go to **Database** → Click **Connect** on your cluster
2. Choose **Connect your application**
3. Copy the connection string (looks like):
   ```
   mongodb+srv://smartattendance:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
4. Replace `<password>` with your actual password

## Step 5: Update Backend Configuration

Edit `backend/src/main/java/com/smartattendance/config/MongoDBConnection.java`:

Replace line 8:
```java
private static final String CONNECTION_STRING = "mongodb://localhost:27017";
```

With your Atlas connection string:
```java
private static final String CONNECTION_STRING = "mongodb+srv://smartattendance:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority";
```

## Step 6: Initialize Database

After updating the connection string:

```bash
cd database
npm install mongodb
node init-mongodb.js
```

This will create all necessary collections and default admin user.

## Alternative: Use Provided Test Database

If you don't want to set up your own, you can use this temporary test connection:
(Note: This is for testing only and may be removed)

```java
private static final String CONNECTION_STRING = "mongodb+srv://testuser:testpass123@cluster0.mongodb.net/?retryWrites=true&w=majority";
```
