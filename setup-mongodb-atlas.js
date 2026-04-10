#!/usr/bin/env node

/**
 * MongoDB Atlas Setup Helper
 * This script helps you set up MongoDB Atlas connection
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('='.repeat(60));
console.log('MongoDB Atlas Setup Helper');
console.log('='.repeat(60));
console.log('\nThis script will help you configure MongoDB Atlas connection.');
console.log('\nIf you don\'t have MongoDB Atlas account:');
console.log('1. Go to https://www.mongodb.com/cloud/atlas/register');
console.log('2. Create a free account and cluster');
console.log('3. Get your connection string\n');

rl.question('Enter your MongoDB Atlas connection string\n(or press Enter to use local MongoDB): ', (connectionString) => {
    
    if (!connectionString || connectionString.trim() === '') {
        connectionString = 'mongodb://localhost:27017';
        console.log('\nUsing local MongoDB: mongodb://localhost:27017');
    } else {
        connectionString = connectionString.trim();
        console.log('\nUsing MongoDB Atlas connection');
    }

    // Update MongoDBConnection.java
    const javaFilePath = path.join(__dirname, 'backend', 'src', 'main', 'java', 'com', 'smartattendance', 'config', 'MongoDBConnection.java');
    
    try {
        let javaContent = fs.readFileSync(javaFilePath, 'utf8');
        
        // Replace the connection string
        javaContent = javaContent.replace(
            /private static final String CONNECTION_STRING = ".*";/,
            `private static final String CONNECTION_STRING = "${connectionString}";`
        );
        
        fs.writeFileSync(javaFilePath, javaContent, 'utf8');
        
        console.log('\n✓ Updated MongoDBConnection.java');
        console.log('\nNext steps:');
        console.log('1. Rebuild backend: cd backend && mvn clean compile dependency:copy-dependencies');
        console.log('2. Initialize database: cd database && node init-mongodb.js');
        console.log('3. Start backend: cd backend && java -cp "target/classes;target/dependency/*" com.smartattendance.SimpleServer');
        console.log('4. Start frontend: cd frontend && npm run dev');
        
    } catch (error) {
        console.error('\n✗ Error updating configuration:', error.message);
    }
    
    rl.close();
});
