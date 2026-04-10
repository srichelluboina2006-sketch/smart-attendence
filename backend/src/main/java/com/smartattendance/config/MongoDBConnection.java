package com.smartattendance.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;

public class MongoDBConnection {
    // MongoDB connection string
    // For local MongoDB: mongodb://localhost:27017
    // For MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/
    private static final String CONNECTION_STRING = System.getenv("MONGODB_URI") != null ? 
        System.getenv("MONGODB_URI") : "mongodb://localhost:27017";
    private static final String DATABASE_NAME = "smart_attendance";
    private static MongoClient mongoClient;
    private static MongoDatabase database;

    static {
        try {
            System.out.println("Connecting to MongoDB...");
            System.out.println("Connection: " + (CONNECTION_STRING.contains("mongodb+srv") ? "MongoDB Atlas (Cloud)" : "Local MongoDB"));
            
            MongoClientSettings settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(CONNECTION_STRING))
                .build();
            
            mongoClient = MongoClients.create(settings);
            database = mongoClient.getDatabase(DATABASE_NAME);
            
            // Test connection
            database.listCollectionNames().first();
            
            System.out.println("✓ MongoDB connection established successfully");
            System.out.println("✓ Database: " + DATABASE_NAME);
        } catch (Exception e) {
            System.err.println("✗ Failed to connect to MongoDB: " + e.getMessage());
            System.err.println("\nPlease ensure:");
            System.err.println("1. MongoDB is running (if using local)");
            System.err.println("2. Connection string is correct (if using Atlas)");
            System.err.println("3. Network access is allowed (if using Atlas)");
            throw new RuntimeException("MongoDB connection failed", e);
        }
    }

    public static MongoDatabase getDatabase() {
        return database;
    }

    public static MongoClient getClient() {
        return mongoClient;
    }

    public static void close() {
        if (mongoClient != null) {
            mongoClient.close();
        }
    }
}
