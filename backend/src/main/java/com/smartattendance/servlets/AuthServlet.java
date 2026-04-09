package com.smartattendance.servlets;

import com.smartattendance.config.DBConnection;
import com.smartattendance.util.JsonUtil;
import com.smartattendance.util.JwtUtil;
import com.smartattendance.util.PasswordUtil;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.*;
import java.util.HashMap;
import java.util.Map;

@WebServlet("/auth/*")
public class AuthServlet extends HttpServlet {

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
        Connection conn = null;
        PreparedStatement stmt = null;
        ResultSet resultSet = null;

        try {
            String requestBody = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(requestBody).getAsJsonObject();

            String usernameInput = payload.get("username").getAsString();
            String passwordInput = payload.get("password").getAsString();

            conn = DBConnection.getConnection();

            String query = "SELECT id, name, username, password, role, email, department_id, is_active FROM users WHERE username = ?";
            stmt = conn.prepareStatement(query);
            stmt.setString(1, usernameInput);
            resultSet = stmt.executeQuery();

            if (!resultSet.next()) {
                JsonUtil.sendError(resp, 401, "Invalid credentials - user not found");
                return;
            }

            boolean activeStatus = resultSet.getBoolean("is_active");
            if (!activeStatus) {
                JsonUtil.sendError(resp, 403, "This account has been deactivated. Contact admin.");
                return;
            }

            String dbPasswordHash = resultSet.getString("password");
            if (!PasswordUtil.verifyPassword(passwordInput, dbPasswordHash)) {
                JsonUtil.sendError(resp, 401, "Invalid credentials - wrong password");
                return;
            }

            int fetchedUserId = resultSet.getInt("id");
            String fetchedRole = resultSet.getString("role");
            String fetchedName = resultSet.getString("name");
            String fetchedEmail = resultSet.getString("email");
            int fetchedDeptId = resultSet.getInt("department_id");

            // Generate JWT token for the authenticated user
            String jwtToken = JwtUtil.generateToken(fetchedUserId, usernameInput, fetchedRole);

            // Record login activity in the logs table
            PreparedStatement logStmt = conn.prepareStatement(
                "INSERT INTO activity_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)");
            logStmt.setInt(1, fetchedUserId);
            logStmt.setString(2, "USER_LOGIN");
            logStmt.setString(3, "User " + usernameInput + " logged in successfully");
            logStmt.setString(4, req.getRemoteAddr());
            logStmt.executeUpdate();
            DBConnection.closeQuietly(logStmt);

            // Build response payload
            Map<String, Object> responseData = new HashMap<>();
            responseData.put("id", fetchedUserId);
            responseData.put("name", fetchedName);
            responseData.put("username", usernameInput);
            responseData.put("email", fetchedEmail);
            responseData.put("role", fetchedRole);
            responseData.put("departmentId", fetchedDeptId);
            responseData.put("token", jwtToken);

            JsonUtil.sendSuccess(resp, "Login successful! Welcome " + fetchedName, responseData);

        } catch (SQLException sqlEx) {
            sqlEx.printStackTrace();
            JsonUtil.sendError(resp, 500, "Database error during login: " + sqlEx.getMessage());
        } catch (Exception ex) {
            ex.printStackTrace();
            JsonUtil.sendError(resp, 500, "Unexpected error: " + ex.getMessage());
        } finally {
            DBConnection.closeQuietly(resultSet, stmt, conn);
        }
    }

    private void performRegister(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement stmt = null;

        try {
            String requestBody = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(requestBody).getAsJsonObject();

            String nameInput = payload.get("name").getAsString();
            String usernameInput = payload.get("username").getAsString();
            String passwordInput = payload.get("password").getAsString();
            String emailInput = payload.has("email") ? payload.get("email").getAsString() : "";
            String roleInput = payload.has("role") ? payload.get("role").getAsString() : "deo";

            // Validate role input
            if (!"admin".equals(roleInput) && !"faculty".equals(roleInput) && !"deo".equals(roleInput)) {
                JsonUtil.sendError(resp, 400, "Invalid role. Must be admin, faculty, or deo.");
                return;
            }

            String hashedPwd = PasswordUtil.hashPassword(passwordInput);

            conn = DBConnection.getConnection();
            String insertQuery = "INSERT INTO users (name, username, password, email, role) VALUES (?, ?, ?, ?, ?)";
            stmt = conn.prepareStatement(insertQuery, Statement.RETURN_GENERATED_KEYS);
            stmt.setString(1, nameInput);
            stmt.setString(2, usernameInput);
            stmt.setString(3, hashedPwd);
            stmt.setString(4, emailInput);
            stmt.setString(5, roleInput);
            stmt.executeUpdate();

            ResultSet generatedKeys = stmt.getGeneratedKeys();
            int createdUserId = 0;
            if (generatedKeys.next()) {
                createdUserId = generatedKeys.getInt(1);
            }

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("id", createdUserId);
            responseData.put("username", usernameInput);
            responseData.put("name", nameInput);
            responseData.put("role", roleInput);

            JsonUtil.sendSuccess(resp, "User registered successfully", responseData);

        } catch (SQLIntegrityConstraintViolationException dupEx) {
            JsonUtil.sendError(resp, 409, "Username '" + dupEx.getMessage() + "' is already taken");
        } catch (SQLException sqlEx) {
            sqlEx.printStackTrace();
            JsonUtil.sendError(resp, 500, "Database error during registration: " + sqlEx.getMessage());
        } catch (Exception ex) {
            ex.printStackTrace();
            JsonUtil.sendError(resp, 500, "Unexpected error: " + ex.getMessage());
        } finally {
            DBConnection.closeQuietly(stmt, conn);
        }
    }
}
