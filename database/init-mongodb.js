#!/usr/bin/env node

const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const CONNECTION_STRING = 'mongodb://localhost:27017';
const DATABASE_NAME = 'smart_attendance';

async function initializeDatabase() {
    const client = new MongoClient(CONNECTION_STRING);
    
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('✓ Connected to MongoDB');
        
        const db = client.db(DATABASE_NAME);
        
        // Drop existing collections
        console.log('\nDropping existing collections...');
        const collections = await db.listCollections().toArray();
        for (const collection of collections) {
            await db.collection(collection.name).drop();
            console.log(`✓ Dropped collection: ${collection.name}`);
        }
        
        // Create collections
        console.log('\nCreating collections...');
        const collectionNames = [
            'users', 'students', 'departments', 'subjects',
            'attendance', 'marks', 'qr_sessions', 'notifications',
            'resources', 'timetable', 'exam_schedule', 'activity_logs',
            'academic_config'
        ];
        
        for (const name of collectionNames) {
            await db.createCollection(name);
            console.log(`✓ Created collection: ${name}`);
        }
        
        // Create indexes
        console.log('\nCreating indexes...');
        
        // Users indexes
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        await db.collection('users').createIndex({ email: 1 });
        await db.collection('users').createIndex({ role: 1 });
        console.log('✓ Users indexes created');
        
        // Students indexes
        await db.collection('students').createIndex({ regno: 1 }, { unique: true });
        await db.collection('students').createIndex({ departmentId: 1 });
        await db.collection('students').createIndex({ year: 1, section: 1 });
        console.log('✓ Students indexes created');
        
        // Departments indexes
        await db.collection('departments').createIndex({ deptCode: 1 }, { unique: true });
        console.log('✓ Departments indexes created');
        
        // Subjects indexes
        await db.collection('subjects').createIndex({ subjectCode: 1 }, { unique: true });
        await db.collection('subjects').createIndex({ departmentId: 1 });
        await db.collection('subjects').createIndex({ facultyId: 1 });
        console.log('✓ Subjects indexes created');
        
        // Attendance indexes
        await db.collection('attendance').createIndex({ studentId: 1, subjectId: 1, date: 1 });
        await db.collection('attendance').createIndex({ date: 1 });
        await db.collection('attendance').createIndex({ sessionId: 1 });
        console.log('✓ Attendance indexes created');
        
        // Marks indexes
        await db.collection('marks').createIndex({ studentId: 1, subjectId: 1 });
        console.log('✓ Marks indexes created');
        
        // QR Sessions indexes (TTL index)
        await db.collection('qr_sessions').createIndex({ sessionId: 1 }, { unique: true });
        await db.collection('qr_sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
        console.log('✓ QR Sessions indexes created');
        
        // Activity logs indexes
        await db.collection('activity_logs').createIndex({ userId: 1 });
        await db.collection('activity_logs').createIndex({ createdAt: -1 });
        console.log('✓ Activity logs indexes created');
        
        // Insert default data
        console.log('\nInserting default data...');
        
        // Insert admin user
        await db.collection('users').insertOne({
            name: 'System Admin',
            username: 'admin',
            password: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
            email: 'admin@smartattendance.com',
            role: 'admin',
            departmentId: null,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log('✓ Admin user created (admin/admin123)');
        
        // Insert sample departments
        const deptResult = await db.collection('departments').insertMany([
            {
                deptName: 'Computer Science & Engineering',
                deptCode: 'CSE',
                hodId: null,
                createdAt: new Date()
            },
            {
                deptName: 'Electronics & Communication',
                deptCode: 'ECE',
                hodId: null,
                createdAt: new Date()
            },
            {
                deptName: 'Electrical & Electronics',
                deptCode: 'EEE',
                hodId: null,
                createdAt: new Date()
            },
            {
                deptName: 'Mechanical Engineering',
                deptCode: 'MECH',
                hodId: null,
                createdAt: new Date()
            },
            {
                deptName: 'Civil Engineering',
                deptCode: 'CIVIL',
                hodId: null,
                createdAt: new Date()
            }
        ]);
        console.log(`✓ ${deptResult.insertedCount} sample departments created`);
        
        // Insert default academic config
        await db.collection('academic_config').insertOne({
            academicYear: '2025-2026',
            semester: 'Semester 1',
            regulation: 'R20',
            attendanceCriteria: 75.00,
            isActive: true,
            createdAt: new Date()
        });
        console.log('✓ Academic configuration created');
        
        console.log('\n' + '='.repeat(50));
        console.log('✓ MongoDB initialization completed successfully!');
        console.log('='.repeat(50));
        console.log('\nDatabase: smart_attendance');
        console.log('Collections: 13');
        console.log('Default Admin User: admin / admin123');
        console.log('\nYou can now run the application!');
        
    } catch (error) {
        console.error('\n✗ Error during initialization:');
        console.error(error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

// Run initialization
initializeDatabase();
