const { MongoClient } = require('mongodb');

const CONNECTION_STRING = 'mongodb://localhost:27017';
const DATABASE_NAME = 'smart_attendance';

async function fixPasswordField() {
    const client = new MongoClient(CONNECTION_STRING);
    
    try {
        console.log('Connecting to MongoDB...');
        await client.connect();
        console.log('✓ Connected to MongoDB');
        
        const db = client.db(DATABASE_NAME);
        const usersCollection = db.collection('users');
        
        // Find all users with passwordHash field
        const usersWithPasswordHash = await usersCollection.find({ passwordHash: { $exists: true } }).toArray();
        console.log(`\nFound ${usersWithPasswordHash.length} users with 'passwordHash' field`);
        
        if (usersWithPasswordHash.length > 0) {
            // Rename passwordHash to password for all users
            const result = await usersCollection.updateMany(
                { passwordHash: { $exists: true } },
                [{ $set: { password: '$passwordHash' } }, { $unset: ['passwordHash'] }]
            );
            console.log(`✓ Updated ${result.modifiedCount} users`);
        }
        
        // Find all users with password field
        const usersWithPassword = await usersCollection.find({ password: { $exists: true } }).toArray();
        console.log(`\nUsers with 'password' field: ${usersWithPassword.length}`);
        
        usersWithPassword.forEach(user => {
            console.log(`  - ${user.username}: ${user.password.substring(0, 16)}...`);
        });
        
        console.log('\n✓ Password field fix completed!');
        
    } catch (error) {
        console.error('\n✗ Error:');
        console.error(error.message);
        process.exit(1);
    } finally {
        await client.close();
    }
}

fixPasswordField();
