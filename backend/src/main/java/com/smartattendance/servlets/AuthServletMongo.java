package com.smartattendance.servlets;

import com.smartattendance.config.MongoDBConnection;
import com.smartattendance.util.JsonUtil;
import com.smartattendance.util.JwtUtil;
import com.smartattendance.util.PasswordUtil;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import org.bson.Document;
import org.bson.types.ObjectId;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

import static com.mongodb.client.model.Filters.eq;

@WebServlet("/auth/*")
public class AuthServletMongo extends HttpServlet {

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getPathInfo();
        if (action == null) action = "/";

        if ("/login".equals(action)) {
            performLogin(req, resp);
        } else if ("/register".equals(action)) {
            performRegister(req, resp);
        } else {
            JsonUtil.sendError(resp, 404, "Auth endpoint not found");
        }
    }

    private void performLogin(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            String requestBody = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(requestBody).getAsJsonObject();

            String usernameInput = payload.get("username").getAsString();
            String passwordInput = payload.get("password").getAsString();

            MongoDatabase database = MongoDBConnection.getDatabase();
            MongoCollection<Document> usersCollection = database.getCollection("users");

            Document userDoc = usersCollection.find(eq("username", usernameInput)).first();

            if (userDoc == null) {
                JsonUtil.sendError(resp, 401, "Invalid credentials - user not found");
                return;
            }

            boolean activeStatus = userDoc.getBoolean("isActive", true);
            if (!activeStatus) {
                JsonUtil.sendError(resp, 403, "This account has been deactivated. Contact admin.");
                return;
            }

            String dbPasswordHash = userDoc.getString("password");
            if (!PasswordUtil.verifyPassword(passwordInput, dbPasswordHash)) {
                JsonUtil.sendError(resp, 401, "Invalid credentials - wrong password");
                return;
            }

            ObjectId userId = userDoc.getObjectId("_id");
            String role = userDoc.getString("role");
            String name = userDoc.getString("name");
            String email = userDoc.getString("email");

            String jwtToken = JwtUtil.generateToken(userId.hashCode(), usernameInput, role);

            // Log activity
            MongoCollection<Document> logsCollection = database.getCollection("activity_logs");
            Document logDoc = new Document()
                    .append("userId", userId)
                    .append("action", "USER_LOGIN")
                    .append("details", "User " + usernameInput + " logged in successfully")
                    .append("ipAddress", req.getRemoteAddr())
                    .append("createdAt", new Date());
            logsCollection.insertOne(logDoc);

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("id", userId.toString());
            responseData.put("name", name);
            responseData.put("username", usernameInput);
            responseData.put("email", email);
            responseData.put("role", role);
            responseData.put("token", jwtToken);

            JsonUtil.sendSuccess(resp, "Login successful! Welcome " + name, responseData);

        } catch (Exception ex) {
            ex.printStackTrace();
            JsonUtil.sendError(resp, 500, "Unexpected error: " + ex.getMessage());
        }
    }

    private void performRegister(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        try {
            String requestBody = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(requestBody).getAsJsonObject();

            String nameInput = payload.get("name").getAsString();
            String usernameInput = payload.get("username").getAsString();
            String passwordInput = payload.get("password").getAsString();
            String emailInput = payload.has("email") ? payload.get("email").getAsString() : "";
            String roleInput = payload.has("role") ? payload.get("role").getAsString() : "deo";

            if (!"admin".equals(roleInput) && !"faculty".equals(roleInput) && !"deo".equals(roleInput)) {
                JsonUtil.sendError(resp, 400, "Invalid role. Must be admin, faculty, or deo.");
                return;
            }

            String hashedPwd = PasswordUtil.hashPassword(passwordInput);

            MongoDatabase database = MongoDBConnection.getDatabase();
            MongoCollection<Document> usersCollection = database.getCollection("users");

            // Check if username already exists
            Document existingUser = usersCollection.find(eq("username", usernameInput)).first();
            if (existingUser != null) {
                JsonUtil.sendError(resp, 409, "Username already exists");
                return;
            }

            Document newUser = new Document()
                    .append("name", nameInput)
                    .append("username", usernameInput)
                    .append("password", hashedPwd)
                    .append("email", emailInput)
                    .append("role", roleInput)
                    .append("departmentId", null)
                    .append("isActive", true)
                    .append("createdAt", new Date())
                    .append("updatedAt", new Date());

            usersCollection.insertOne(newUser);
            ObjectId createdUserId = newUser.getObjectId("_id");

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("id", createdUserId.toString());
            responseData.put("username", usernameInput);
            responseData.put("name", nameInput);
            responseData.put("role", roleInput);

            JsonUtil.sendSuccess(resp, "User registered successfully", responseData);

        } catch (Exception ex) {
            ex.printStackTrace();
            JsonUtil.sendError(resp, 500, "Unexpected error: " + ex.getMessage());
        }
    }
}
