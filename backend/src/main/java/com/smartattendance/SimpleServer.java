package com.smartattendance;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.MongoCollection;
import org.bson.Document;
import org.bson.types.ObjectId;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import com.smartattendance.config.MongoDBConnection;
import com.smartattendance.util.PasswordUtil;
import com.smartattendance.util.JwtUtil;

import java.io.OutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import java.net.InetSocketAddress;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.util.Enumeration;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.ArrayList;
import java.util.Date;
import java.util.Base64;
import java.util.UUID;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

public class SimpleServer {
    private static final Gson gson = new Gson();
    private static String LOCAL_IP = "localhost";

    private static String detectLocalIP() {
        try {
            Enumeration<NetworkInterface> interfaces = NetworkInterface.getNetworkInterfaces();
            while (interfaces.hasMoreElements()) {
                NetworkInterface ni = interfaces.nextElement();
                if (ni.isLoopback() || !ni.isUp()) continue;
                Enumeration<InetAddress> addresses = ni.getInetAddresses();
                while (addresses.hasMoreElements()) {
                    InetAddress addr = addresses.nextElement();
                    if (addr instanceof java.net.Inet4Address) {
                        String ip = addr.getHostAddress();
                        if (!ip.startsWith("127.")) return ip;
                    }
                }
            }
        } catch (Exception e) { System.err.println("Could not detect LAN IP: " + e.getMessage()); }
        return "localhost";
    }

    public static void main(String[] args) throws Exception {
        LOCAL_IP = detectLocalIP();
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", 8080), 0);

        server.createContext("/", new MainHandler());

        server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(10));
        server.start();

        System.out.println("=== Smart Attendance System Backend ===");
        System.out.println("Server started on http://0.0.0.0:8080");
        System.out.println("LAN IP detected: " + LOCAL_IP);
        System.out.println("QR codes will use: http://" + LOCAL_IP + ":8080/attend/...");
        System.out.println("Database: " + MongoDBConnection.getDatabase().getName());
        System.out.println("Endpoints:");
        System.out.println("  POST /auth/login  POST /auth/register  GET /auth/check-users");
        System.out.println("  GET|POST /users         GET|POST /departments");
        System.out.println("  GET|POST /subjects      GET|POST /students");
        System.out.println("  GET|POST /notifications GET /dashboard");
        System.out.println("  DELETE /users/:id  DELETE /departments/:id  DELETE /subjects/:id  DELETE /students/:id");
        System.out.println("  POST /attendance/sessions  GET /attendance/sessions?facultyId=x");
        System.out.println("  GET /attendance/session/:id  POST /attendance/submit");
        System.out.println("  GET /attendance/records/:sessionId");
    }

    static class MainHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) {
            try {
                String path = exchange.getRequestURI().getPath();
                String method = exchange.getRequestMethod();

                System.out.println("[" + method + "] " + path);

                if ("OPTIONS".equals(method)) {
                    setCors(exchange);
                    exchange.sendResponseHeaders(204, -1);
                    return;
                }

                setCors(exchange);

                // Auth
                if ("/auth/login".equals(path) && "POST".equals(method)) {
                    handleLogin(exchange);
                } else if ("/auth/register".equals(path) && "POST".equals(method)) {
                    handleRegister(exchange);
                } else if ("/auth/check-users".equals(path) && "GET".equals(method)) {
                    handleCheckUsers(exchange);
                }
                // Users
                else if ("/users".equals(path) && "GET".equals(method)) {
                    handleGetUsers(exchange);
                } else if ("/users".equals(path) && "POST".equals(method)) {
                    handleCreateUser(exchange);
                } else if (path.startsWith("/users/") && "DELETE".equals(method)) {
                    handleDeleteUser(exchange, path.substring(7));
                }
                // Departments
                else if ("/departments".equals(path) && "GET".equals(method)) {
                    handleGetDepartments(exchange);
                } else if ("/departments".equals(path) && "POST".equals(method)) {
                    handleCreateDepartment(exchange);
                } else if (path.startsWith("/departments/") && "DELETE".equals(method)) {
                    handleDeleteDepartment(exchange, path.substring(13));
                }
                // Subjects
                else if ("/subjects".equals(path) && "GET".equals(method)) {
                    handleGetSubjects(exchange);
                } else if ("/subjects".equals(path) && "POST".equals(method)) {
                    handleCreateSubject(exchange);
                } else if (path.startsWith("/subjects/") && "DELETE".equals(method)) {
                    handleDeleteSubject(exchange, path.substring(10));
                }
                // Students
                else if ("/students".equals(path) && "GET".equals(method)) {
                    handleGetStudents(exchange);
                } else if ("/students".equals(path) && "POST".equals(method)) {
                    handleCreateStudent(exchange);
                } else if (path.startsWith("/students/") && "DELETE".equals(method)) {
                    handleDeleteStudent(exchange, path.substring(10));
                }
                // Notifications
                else if ("/notifications".equals(path) && "GET".equals(method)) {
                    handleGetNotifications(exchange);
                } else if ("/notifications".equals(path) && "POST".equals(method)) {
                    handleCreateNotification(exchange);
                }
                // Faculty-Subject Assignment
                else if (path.startsWith("/faculty/subjects/") && "GET".equals(method)) {
                    handleGetFacultySubjects(exchange, path.substring(18));
                } else if ("/faculty/subjects".equals(path) && "POST".equals(method)) {
                    handleAssignFacultySubjects(exchange);
                }
                // Serve attendance HTML form directly (for QR scan from phones)
                else if (path.startsWith("/attend/") && "GET".equals(method)) {
                    handleServeAttendanceForm(exchange, path.substring(8));
                }
                // Attendance Sessions
                else if ("/attendance/sessions".equals(path) && "POST".equals(method)) {
                    handleCreateAttendanceSession(exchange);
                } else if ("/attendance/sessions".equals(path) && "GET".equals(method)) {
                    handleGetAttendanceSessions(exchange);
                } else if (path.startsWith("/attendance/session/") && "GET".equals(method)) {
                    handleGetSessionInfo(exchange, path.substring(20));
                } else if ("/attendance/submit".equals(path) && "POST".equals(method)) {
                    handleSubmitAttendance(exchange);
                } else if (path.startsWith("/attendance/records/") && "GET".equals(method)) {
                    handleGetAttendanceRecords(exchange, path.substring(20));
                }
                // Dashboard
                else if ("/dashboard".equals(path) && "GET".equals(method)) {
                    handleGetDashboard(exchange);
                }
                // Health
                else if ("/health".equals(path)) {
                    JsonObject r = new JsonObject();
                    r.addProperty("status", "ok");
                    sendJson(exchange, 200, r);
                } else {
                    sendError(exchange, 404, "Not found: " + path);
                }
            } catch (Exception e) {
                e.printStackTrace();
                try {
                    sendError(exchange, 500, "Server error: " + e.getMessage());
                } catch (Exception ex) {
                    ex.printStackTrace();
                }
            }
        }
    }

    private static void setCors(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static String readBody(HttpExchange exchange) throws Exception {
        InputStream is = exchange.getRequestBody();
        byte[] bytes = is.readAllBytes();
        is.close();
        return new String(bytes, StandardCharsets.UTF_8);
    }

    // ==================== AUTH ====================

    private static void handleLogin(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("username") || !req.has("password")) {
            sendError(exchange, 400, "Username and password are required");
            return;
        }

        String username = req.get("username").getAsString().trim();
        String password = req.get("password").getAsString();

        if (username.isEmpty() || password.isEmpty()) {
            sendError(exchange, 400, "Username and password cannot be empty");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();
        Document user = db.getCollection("users").find(new Document("username", username)).first();

        if (user == null) {
            sendError(exchange, 401, "User not found");
            return;
        }

        // Support both "password" and "passwordHash" field names
        String storedHash = user.getString("password");
        if (storedHash == null) {
            storedHash = user.getString("passwordHash");
        }
        
        if (storedHash == null || !PasswordUtil.verifyPassword(password, storedHash)) {
            sendError(exchange, 401, "Invalid password");
            return;
        }

        String token = JwtUtil.generateToken(
            user.getObjectId("_id").hashCode(),
            username,
            user.getString("role")
        );

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("userId", user.getObjectId("_id").toHexString());
        res.addProperty("username", user.getString("username"));
        res.addProperty("name", user.getString("name"));
        res.addProperty("email", user.getString("email"));
        res.addProperty("role", user.getString("role"));
        res.addProperty("token", token);
        sendJson(exchange, 200, res);
    }

    private static void handleRegister(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("name") || !req.has("username") || !req.has("password") || !req.has("role")) {
            sendError(exchange, 400, "Name, username, password and role are required");
            return;
        }

        String name = req.get("name").getAsString().trim();
        String username = req.get("username").getAsString().trim();
        String password = req.get("password").getAsString();
        String email = req.has("email") && !req.get("email").isJsonNull() ? req.get("email").getAsString().trim() : "";
        String role = req.get("role").getAsString().trim();

        if (name.isEmpty() || username.isEmpty() || password.isEmpty()) {
            sendError(exchange, 400, "Name, username and password cannot be empty");
            return;
        }

        if (password.length() < 4) {
            sendError(exchange, 400, "Password must be at least 4 characters");
            return;
        }

        if (!role.equals("admin") && !role.equals("faculty") && !role.equals("deo")) {
            sendError(exchange, 400, "Role must be admin, faculty or deo");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();
        MongoCollection<Document> users = db.getCollection("users");

        Document existingUsername = users.find(new Document("username", username)).first();
        if (existingUsername != null) {
            sendError(exchange, 409, "Username '" + username + "' already exists. Please choose a different username.");
            return;
        }

        if (!email.isEmpty()) {
            Document existingEmail = users.find(new Document("email", email)).first();
            if (existingEmail != null) {
                sendError(exchange, 409, "Email '" + email + "' is already registered.");
                return;
            }
        }

        Document user = new Document()
            .append("name", name)
            .append("username", username)
            .append("password", PasswordUtil.hashPassword(password))
            .append("email", email)
            .append("role", role)
            .append("isActive", true)
            .append("createdAt", new Date())
            .append("updatedAt", new Date());

        users.insertOne(user);
        System.out.println("  User registered: " + username + " (" + role + ")");

        String token = JwtUtil.generateToken(
            user.getObjectId("_id").hashCode(),
            username,
            role
        );

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Registration successful");
        res.addProperty("userId", user.getObjectId("_id").toHexString());
        res.addProperty("username", username);
        res.addProperty("name", name);
        res.addProperty("email", email);
        res.addProperty("role", role);
        res.addProperty("token", token);
        sendJson(exchange, 200, res);
    }

    private static void handleCheckUsers(HttpExchange exchange) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        long count = db.getCollection("users").countDocuments();
        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("hasUsers", count > 0);
        res.addProperty("count", count);
        sendJson(exchange, 200, res);
    }

    // ==================== USERS ====================

    private static void handleGetUsers(HttpExchange exchange) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        List<Document> docs = db.getCollection("users").find().into(new ArrayList<>());

        JsonArray arr = new JsonArray();
        for (Document d : docs) {
            JsonObject u = new JsonObject();
            u.addProperty("id", d.getObjectId("_id").toHexString());
            u.addProperty("name", d.getString("name"));
            u.addProperty("username", d.getString("username"));
            u.addProperty("email", d.getString("email"));
            u.addProperty("role", d.getString("role"));
            u.addProperty("isActive", d.getBoolean("isActive", true));
            Date created = d.getDate("createdAt");
            u.addProperty("createdAt", created != null ? created.toString() : "");
            arr.add(u);
        }

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.add("data", arr);
        sendJson(exchange, 200, res);
    }

    private static void handleCreateUser(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("name") || !req.has("username") || !req.has("password") || !req.has("role")) {
            sendError(exchange, 400, "Name, username, password and role are required");
            return;
        }

        String name = req.get("name").getAsString().trim();
        String username = req.get("username").getAsString().trim();
        String password = req.get("password").getAsString();
        String email = req.has("email") && !req.get("email").isJsonNull() ? req.get("email").getAsString().trim() : "";
        String role = req.get("role").getAsString().trim();

        if (name.isEmpty() || username.isEmpty() || password.isEmpty()) {
            sendError(exchange, 400, "Name, username and password cannot be empty");
            return;
        }

        if (password.length() < 4) {
            sendError(exchange, 400, "Password must be at least 4 characters");
            return;
        }

        if (!role.equals("admin") && !role.equals("faculty") && !role.equals("deo")) {
            sendError(exchange, 400, "Role must be admin, faculty or deo");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();
        MongoCollection<Document> users = db.getCollection("users");

        Document existingUsername = users.find(new Document("username", username)).first();
        if (existingUsername != null) {
            sendError(exchange, 409, "Username '" + username + "' already exists. Please choose a different username.");
            return;
        }

        if (!email.isEmpty()) {
            Document existingEmail = users.find(new Document("email", email)).first();
            if (existingEmail != null) {
                sendError(exchange, 409, "Email '" + email + "' is already registered.");
                return;
            }
        }

        Document user = new Document()
            .append("name", name)
            .append("username", username)
            .append("password", PasswordUtil.hashPassword(password))
            .append("email", email)
            .append("role", role)
            .append("isActive", true)
            .append("createdAt", new Date())
            .append("updatedAt", new Date());

        users.insertOne(user);
        System.out.println("  User created: " + username + " (" + role + ")");

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "User '" + name + "' created successfully as " + role);
        res.addProperty("userId", user.getObjectId("_id").toHexString());
        sendJson(exchange, 200, res);
    }

    private static void handleDeleteUser(HttpExchange exchange, String id) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        Document result = db.getCollection("users").findOneAndDelete(new Document("_id", new ObjectId(id)));
        if (result == null) {
            sendError(exchange, 404, "User not found");
            return;
        }
        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "User '" + result.getString("name") + "' deleted");
        sendJson(exchange, 200, res);
    }

    // ==================== DEPARTMENTS ====================

    private static void handleGetDepartments(HttpExchange exchange) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        List<Document> docs = db.getCollection("departments").find().into(new ArrayList<>());

        JsonArray arr = new JsonArray();
        for (Document d : docs) {
            JsonObject dept = new JsonObject();
            String deptIdHex = d.getObjectId("_id").toHexString();
            dept.addProperty("id", deptIdHex);
            dept.addProperty("deptName", d.getString("deptName"));
            dept.addProperty("deptCode", d.getString("deptCode"));
            try {
                long subjectCount = db.getCollection("subjects")
                    .countDocuments(new Document("departmentId", d.getObjectId("_id")));
                dept.addProperty("subjectCount", subjectCount);
            } catch (Exception e) { dept.addProperty("subjectCount", 0); }
            try {
                long studentCount = db.getCollection("students")
                    .countDocuments(new Document("departmentId", deptIdHex));
                dept.addProperty("studentCount", studentCount);
            } catch (Exception e) { dept.addProperty("studentCount", 0); }
            arr.add(dept);
        }

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.add("data", arr);
        sendJson(exchange, 200, res);
    }

    private static void handleCreateDepartment(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("deptName") || !req.has("deptCode")) {
            sendError(exchange, 400, "Department name and code are required");
            return;
        }

        String deptName = req.get("deptName").getAsString().trim();
        String deptCode = req.get("deptCode").getAsString().trim().toUpperCase();

        if (deptName.isEmpty() || deptCode.isEmpty()) {
            sendError(exchange, 400, "Department name and code cannot be empty");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();
        MongoCollection<Document> departments = db.getCollection("departments");

        Document existingCode = departments.find(new Document("deptCode", deptCode)).first();
        if (existingCode != null) {
            sendError(exchange, 409, "Department with code '" + deptCode + "' already exists.");
            return;
        }

        Document existingName = departments.find(new Document("deptName", deptName)).first();
        if (existingName != null) {
            sendError(exchange, 409, "Department '" + deptName + "' already exists.");
            return;
        }

        Document dept = new Document()
            .append("deptName", deptName)
            .append("deptCode", deptCode)
            .append("createdAt", new Date());

        departments.insertOne(dept);
        System.out.println("  Department created: " + deptName + " (" + deptCode + ")");

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Department '" + deptName + "' (" + deptCode + ") created successfully");
        res.addProperty("deptId", dept.getObjectId("_id").toHexString());
        sendJson(exchange, 200, res);
    }

    private static void handleDeleteDepartment(HttpExchange exchange, String id) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        long subjectCount = db.getCollection("subjects")
            .countDocuments(new Document("departmentId", new ObjectId(id)));
        if (subjectCount > 0) {
            sendError(exchange, 400, "Cannot delete: department has " + subjectCount + " subject(s) linked. Remove subjects first.");
            return;
        }
        Document result = db.getCollection("departments").findOneAndDelete(new Document("_id", new ObjectId(id)));
        if (result == null) {
            sendError(exchange, 404, "Department not found");
            return;
        }
        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Department '" + result.getString("deptName") + "' deleted");
        sendJson(exchange, 200, res);
    }

    // ==================== SUBJECTS ====================

    private static void handleGetSubjects(HttpExchange exchange) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        List<Document> docs = db.getCollection("subjects").find().into(new ArrayList<>());

        JsonArray arr = new JsonArray();
        for (Document d : docs) {
            JsonObject subj = new JsonObject();
            subj.addProperty("id", d.getObjectId("_id").toHexString());
            subj.addProperty("subjectName", d.getString("subjectName"));
            subj.addProperty("subjectCode", d.getString("subjectCode"));
            if (d.get("departmentId") != null) {
                subj.addProperty("departmentId", d.get("departmentId").toString());
                Document dept = db.getCollection("departments")
                    .find(new Document("_id", d.get("departmentId"))).first();
                subj.addProperty("departmentName", dept != null ? dept.getString("deptName") : "Unknown");
            } else {
                subj.addProperty("departmentId", "");
                subj.addProperty("departmentName", "");
            }
            subj.addProperty("semester", d.getInteger("semester", 0));
            subj.addProperty("credits", d.getInteger("credits", 0));
            arr.add(subj);
        }

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.add("data", arr);
        sendJson(exchange, 200, res);
    }

    private static void handleCreateSubject(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("subjectName") || !req.has("subjectCode") || !req.has("departmentId")) {
            sendError(exchange, 400, "Subject name, code and department are required");
            return;
        }

        String subjectName = req.get("subjectName").getAsString().trim();
        String subjectCode = req.get("subjectCode").getAsString().trim().toUpperCase();
        String departmentId = req.get("departmentId").getAsString().trim();
        int semester = req.has("semester") ? req.get("semester").getAsInt() : 1;
        int credits = req.has("credits") ? req.get("credits").getAsInt() : 3;

        if (subjectName.isEmpty() || subjectCode.isEmpty() || departmentId.isEmpty()) {
            sendError(exchange, 400, "Subject name, code and department cannot be empty");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();
        MongoCollection<Document> subjects = db.getCollection("subjects");

        Document existingCode = subjects.find(new Document("subjectCode", subjectCode)).first();
        if (existingCode != null) {
            sendError(exchange, 409, "Subject with code '" + subjectCode + "' already exists.");
            return;
        }

        Document deptDoc = db.getCollection("departments").find(new Document("_id", new ObjectId(departmentId))).first();
        if (deptDoc == null) {
            sendError(exchange, 400, "Selected department does not exist");
            return;
        }

        Document subject = new Document()
            .append("subjectName", subjectName)
            .append("subjectCode", subjectCode)
            .append("departmentId", new ObjectId(departmentId))
            .append("semester", semester)
            .append("credits", credits)
            .append("createdAt", new Date());

        subjects.insertOne(subject);
        System.out.println("  Subject created: " + subjectName + " (" + subjectCode + ")");

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Subject '" + subjectName + "' (" + subjectCode + ") created successfully");
        res.addProperty("subjectId", subject.getObjectId("_id").toHexString());
        sendJson(exchange, 200, res);
    }

    private static void handleDeleteSubject(HttpExchange exchange, String id) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        Document result = db.getCollection("subjects").findOneAndDelete(new Document("_id", new ObjectId(id)));
        if (result == null) {
            sendError(exchange, 404, "Subject not found");
            return;
        }
        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Subject '" + result.getString("subjectName") + "' deleted");
        sendJson(exchange, 200, res);
    }

    // ==================== STUDENTS ====================

    private static void handleGetStudents(HttpExchange exchange) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        List<Document> docs = db.getCollection("students").find().into(new ArrayList<>());

        JsonArray arr = new JsonArray();
        for (Document d : docs) {
            JsonObject s = new JsonObject();
            s.addProperty("id", d.getObjectId("_id").toHexString());
            s.addProperty("name", d.getString("name"));
            s.addProperty("rollNumber", d.getString("rollNumber"));
            s.addProperty("email", d.getString("email"));
            s.addProperty("departmentId", d.getString("departmentId") != null ? d.getString("departmentId") : "");
            s.addProperty("semester", d.getInteger("semester", 1));
            s.addProperty("section", d.getString("section") != null ? d.getString("section") : "A");
            if (d.getString("departmentId") != null && !d.getString("departmentId").isEmpty()) {
                try {
                    Document dept = db.getCollection("departments")
                        .find(new Document("_id", new ObjectId(d.getString("departmentId")))).first();
                    s.addProperty("departmentName", dept != null ? dept.getString("deptName") : "Unknown");
                } catch (Exception e) {
                    s.addProperty("departmentName", "");
                }
            } else {
                s.addProperty("departmentName", "");
            }
            arr.add(s);
        }

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.add("data", arr);
        sendJson(exchange, 200, res);
    }

    private static void handleCreateStudent(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("name") || !req.has("rollNumber") || !req.has("departmentId")) {
            sendError(exchange, 400, "Name, roll number and department are required");
            return;
        }

        String name = req.get("name").getAsString().trim();
        String rollNumber = req.get("rollNumber").getAsString().trim().toUpperCase();
        String email = req.has("email") && !req.get("email").isJsonNull() ? req.get("email").getAsString().trim() : "";
        String departmentId = req.get("departmentId").getAsString().trim();
        int semester = req.has("semester") ? req.get("semester").getAsInt() : 1;
        String section = req.has("section") ? req.get("section").getAsString().trim().toUpperCase() : "A";

        if (name.isEmpty() || rollNumber.isEmpty()) {
            sendError(exchange, 400, "Name and roll number cannot be empty");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();
        MongoCollection<Document> students = db.getCollection("students");

        Document existing = students.find(new Document("rollNumber", rollNumber)).first();
        if (existing != null) {
            sendError(exchange, 409, "Student with roll number '" + rollNumber + "' already exists.");
            return;
        }

        Document student = new Document()
            .append("name", name)
            .append("rollNumber", rollNumber)
            .append("email", email)
            .append("departmentId", departmentId)
            .append("semester", semester)
            .append("section", section)
            .append("createdAt", new Date());

        students.insertOne(student);
        System.out.println("  Student created: " + name + " (" + rollNumber + ")");

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Student '" + name + "' (" + rollNumber + ") enrolled successfully");
        res.addProperty("studentId", student.getObjectId("_id").toHexString());
        sendJson(exchange, 200, res);
    }

    private static void handleDeleteStudent(HttpExchange exchange, String id) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        Document result = db.getCollection("students").findOneAndDelete(new Document("_id", new ObjectId(id)));
        if (result == null) {
            sendError(exchange, 404, "Student not found");
            return;
        }
        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Student '" + result.getString("name") + "' removed");
        sendJson(exchange, 200, res);
    }

    // ==================== NOTIFICATIONS ====================

    private static void handleGetNotifications(HttpExchange exchange) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();
        List<Document> docs = db.getCollection("notifications")
            .find().sort(new Document("createdAt", -1)).into(new ArrayList<>());

        JsonArray arr = new JsonArray();
        for (Document d : docs) {
            JsonObject n = new JsonObject();
            n.addProperty("id", d.getObjectId("_id").toHexString());
            n.addProperty("title", d.getString("title"));
            n.addProperty("message", d.getString("message"));
            n.addProperty("type", d.getString("type") != null ? d.getString("type") : "info");
            n.addProperty("target", d.getString("target") != null ? d.getString("target") : "all");
            Date created = d.getDate("createdAt");
            n.addProperty("createdAt", created != null ? created.toString() : "");
            arr.add(n);
        }

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.add("data", arr);
        sendJson(exchange, 200, res);
    }

    private static void handleCreateNotification(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("title") || !req.has("message")) {
            sendError(exchange, 400, "Title and message are required");
            return;
        }

        String title = req.get("title").getAsString().trim();
        String message = req.get("message").getAsString().trim();
        String type = req.has("type") ? req.get("type").getAsString() : "info";
        String target = req.has("target") ? req.get("target").getAsString() : "all";

        if (title.isEmpty() || message.isEmpty()) {
            sendError(exchange, 400, "Title and message cannot be empty");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();
        Document notification = new Document()
            .append("title", title)
            .append("message", message)
            .append("type", type)
            .append("target", target)
            .append("createdAt", new Date());

        db.getCollection("notifications").insertOne(notification);
        System.out.println("  Notification sent: " + title);

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Notification sent successfully");
        sendJson(exchange, 200, res);
    }

    // ==================== DASHBOARD ====================

    private static void handleGetDashboard(HttpExchange exchange) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();

        JsonObject stats = new JsonObject();
        stats.addProperty("totalUsers", db.getCollection("users").countDocuments());
        stats.addProperty("totalStudents", db.getCollection("students").countDocuments());
        stats.addProperty("totalDepartments", db.getCollection("departments").countDocuments());
        stats.addProperty("totalSubjects", db.getCollection("subjects").countDocuments());
        stats.addProperty("totalNotifications", db.getCollection("notifications").countDocuments());

        // Recent activity
        JsonArray recentUsers = new JsonArray();
        List<Document> latestUsers = db.getCollection("users").find()
            .sort(new Document("createdAt", -1)).limit(5).into(new ArrayList<>());
        for (Document d : latestUsers) {
            JsonObject u = new JsonObject();
            u.addProperty("id", d.getObjectId("_id").toHexString());
            u.addProperty("name", d.getString("name"));
            u.addProperty("username", d.getString("username"));
            u.addProperty("email", d.getString("email"));
            u.addProperty("role", d.getString("role"));
            u.addProperty("isActive", d.getBoolean("isActive", true));
            Date created = d.getDate("createdAt");
            u.addProperty("createdAt", created != null ? created.toString() : "");
            recentUsers.add(u);
        }
        stats.add("recentUsers", recentUsers);

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.add("data", stats);
        sendJson(exchange, 200, res);
    }

    // ==================== FACULTY-SUBJECT ASSIGNMENT ====================

    private static void handleAssignFacultySubjects(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("facultyId") || !req.has("subjectIds")) {
            sendError(exchange, 400, "Faculty ID and subject IDs are required");
            return;
        }

        String facultyId = req.get("facultyId").getAsString().trim();
        if (facultyId.isEmpty()) {
            sendError(exchange, 400, "Faculty ID cannot be empty");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();

        // Verify faculty exists
        Document faculty = db.getCollection("users").find(new Document("_id", new ObjectId(facultyId))).first();
        if (faculty == null) {
            sendError(exchange, 404, "Faculty not found");
            return;
        }

        // Parse subject IDs array
        List<String> subjectIds = new ArrayList<>();
        for (var el : req.getAsJsonArray("subjectIds")) {
            subjectIds.add(el.getAsString());
        }

        // Remove old assignments for this faculty
        db.getCollection("faculty_subjects").deleteMany(new Document("facultyId", facultyId));

        // Insert new assignments
        for (String subjectId : subjectIds) {
            Document subject = db.getCollection("subjects").find(new Document("_id", new ObjectId(subjectId))).first();
            if (subject != null) {
                Document assignment = new Document()
                    .append("facultyId", facultyId)
                    .append("subjectId", subjectId)
                    .append("subjectName", subject.getString("subjectName"))
                    .append("subjectCode", subject.getString("subjectCode"))
                    .append("createdAt", new Date());

                if (subject.get("departmentId") != null) {
                    try {
                        Document dept = db.getCollection("departments")
                            .find(new Document("_id", subject.get("departmentId"))).first();
                        if (dept != null) assignment.append("departmentName", dept.getString("deptName"));
                    } catch (Exception e) { /* ignore */ }
                }

                db.getCollection("faculty_subjects").insertOne(assignment);
            }
        }

        System.out.println("  Faculty " + faculty.getString("name") + " assigned " + subjectIds.size() + " subject(s)");

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Assigned " + subjectIds.size() + " subject(s) to " + faculty.getString("name"));
        sendJson(exchange, 200, res);
    }

    private static void handleGetFacultySubjects(HttpExchange exchange, String facultyId) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();

        List<Document> docs = db.getCollection("faculty_subjects")
            .find(new Document("facultyId", facultyId)).into(new ArrayList<>());

        JsonArray arr = new JsonArray();
        for (Document d : docs) {
            JsonObject s = new JsonObject();
            s.addProperty("id", d.getString("subjectId"));
            s.addProperty("subjectName", d.getString("subjectName"));
            s.addProperty("subjectCode", d.getString("subjectCode"));
            s.addProperty("departmentName", d.getString("departmentName") != null ? d.getString("departmentName") : "");
            arr.add(s);
        }

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.add("data", arr);
        sendJson(exchange, 200, res);
    }

    // ==================== SERVE ATTENDANCE HTML FORM ====================

    private static void handleServeAttendanceForm(HttpExchange exchange, String sessionId) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();

        Document session;
        try {
            session = db.getCollection("attendance_sessions")
                .find(new Document("_id", new ObjectId(sessionId))).first();
        } catch (Exception e) {
            sendHtml(exchange, 404, errorPage("Invalid Session", "This attendance link is not valid."));
            return;
        }

        if (session == null) {
            sendHtml(exchange, 404, errorPage("Session Not Found", "This attendance session does not exist."));
            return;
        }

        Date expires = session.getDate("expiresAt");
        boolean expired = expires != null && expires.before(new Date());

        if (expired) {
            sendHtml(exchange, 400, errorPage("Session Expired", "This attendance session has expired. Please contact your faculty."));
            return;
        }

        if (!session.getBoolean("isActive", false)) {
            sendHtml(exchange, 400, errorPage("Session Closed", "This attendance session has been closed by the faculty."));
            return;
        }

        String subjectName = session.getString("subjectName");
        String subjectCode = session.getString("subjectCode");
        String facultyName = session.getString("facultyName");
        String deptName = session.getString("departmentName") != null ? session.getString("departmentName") : "";
        String sessionCode = session.getString("sessionCode");
        String backendUrl = "http://" + LOCAL_IP + ":8080";

        String html = "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1.0'>"
            + "<title>Mark Attendance</title>"
            + "<style>"
            + "*{margin:0;padding:0;box-sizing:border-box}"
            + "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#030712;color:#e5e7eb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}"
            + ".card{background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;width:100%;max-width:420px}"
            + ".icon{width:56px;height:56px;border-radius:12px;background:linear-gradient(135deg,#2563eb,#06b6d4);display:flex;align-items:center;justify-content:center;margin:0 auto 16px}"
            + ".icon svg{width:28px;height:28px;fill:none;stroke:white;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}"
            + "h1{text-align:center;font-size:20px;font-weight:700;color:#f3f4f6;margin-bottom:4px}"
            + ".sub{text-align:center;font-size:12px;color:#6b7280;margin-bottom:20px}"
            + ".info{background:rgba(31,41,55,0.5);border-radius:12px;padding:14px;margin-bottom:20px}"
            + ".info-row{display:flex;justify-content:space-between;font-size:13px;padding:4px 0}"
            + ".info-row .lbl{color:#6b7280}.info-row .val{color:#e5e7eb;font-weight:500}"
            + ".info-row .code{color:#60a5fa;font-family:monospace;font-weight:700}"
            + "label{display:block;font-size:12px;font-weight:500;color:#9ca3af;margin-bottom:6px}"
            + "input{width:100%;padding:12px 16px;background:rgba(31,41,55,0.5);border:1px solid #374151;border-radius:12px;color:#e5e7eb;font-size:14px;outline:none;transition:all 0.2s}"
            + "input:focus{border-color:#2563eb;box-shadow:0 0 0 3px rgba(37,99,235,0.2)}"
            + "input::placeholder{color:#4b5563}"
            + ".field{margin-bottom:14px}"
            + ".btn{width:100%;padding:14px;background:linear-gradient(135deg,#2563eb,#06b6d4);color:white;font-size:15px;font-weight:600;border:none;border-radius:12px;cursor:pointer;transition:all 0.2s;margin-top:6px}"
            + ".btn:hover{opacity:0.9}.btn:disabled{opacity:0.5;cursor:not-allowed}"
            + ".error{background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#f87171;padding:12px;border-radius:12px;font-size:13px;margin-bottom:14px;display:none}"
            + ".success-card{text-align:center}.success-icon{width:80px;height:80px;border-radius:50%;background:rgba(16,185,129,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 20px}"
            + ".success-icon svg{width:40px;height:40px;stroke:#10b981;fill:none;stroke-width:2}"
            + "h2{font-size:22px;color:#f3f4f6;margin-bottom:8px}"
            + ".success-sub{color:#6b7280;font-size:13px;margin-bottom:20px}"
            + ".footer{text-align:center;font-size:10px;color:#374151;margin-top:16px}"
            + "</style></head><body>"
            + "<div class='card' id='formCard'>"
            + "<div class='icon'><svg viewBox='0 0 24 24'><path d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'/></svg></div>"
            + "<h1>Mark Your Attendance</h1>"
            + "<p class='sub'>Fill in your details to confirm attendance</p>"
            + "<div class='info'>"
            + "<div class='info-row'><span class='lbl'>Subject</span><span class='val'>" + subjectName + " (" + subjectCode + ")</span></div>"
            + (deptName.isEmpty() ? "" : "<div class='info-row'><span class='lbl'>Department</span><span class='val'>" + deptName + "</span></div>")
            + "<div class='info-row'><span class='lbl'>Faculty</span><span class='val'>" + facultyName + "</span></div>"
            + "<div class='info-row'><span class='lbl'>Session</span><span class='code'>" + sessionCode + "</span></div>"
            + "</div>"
            + "<div id='errorMsg' class='error'></div>"
            + "<form id='attendForm' onsubmit='submitForm(event)'>"
            + "<div class='field'><label>Full Name *</label><input type='text' id='fname' placeholder='Enter your full name' required></div>"
            + "<div class='field'><label>Roll Number *</label><input type='text' id='froll' placeholder='e.g., 21CSE001' required></div>"
            + "<div class='field'><label>Email (Optional)</label><input type='email' id='femail' placeholder='your.email@college.edu'></div>"
            + "<button type='submit' class='btn' id='submitBtn'>Submit Attendance</button>"
            + "</form>"
            + "<p class='footer'>Smart Attendance System</p>"
            + "</div>"
            + "<div class='card success-card' id='successCard' style='display:none'>"
            + "<div class='success-icon'><svg viewBox='0 0 24 24'><path d='M22 11.08V12a10 10 0 11-5.93-9.14'/><polyline points='22 4 12 14.01 9 11.01'/></svg></div>"
            + "<h2>Attendance Recorded!</h2>"
            + "<p class='success-sub'>Your attendance has been successfully submitted.</p>"
            + "<div class='info' id='successInfo'></div>"
            + "<p class='footer'>Smart Attendance System</p>"
            + "</div>"
            + "<script>"
            + "async function submitForm(e){"
            + "e.preventDefault();"
            + "var btn=document.getElementById('submitBtn');"
            + "var errDiv=document.getElementById('errorMsg');"
            + "errDiv.style.display='none';"
            + "btn.disabled=true;btn.textContent='Submitting...';"
            + "var name=document.getElementById('fname').value.trim();"
            + "var roll=document.getElementById('froll').value.trim();"
            + "var email=document.getElementById('femail').value.trim();"
            + "if(!name||!roll){errDiv.textContent='Name and Roll Number are required';errDiv.style.display='block';btn.disabled=false;btn.textContent='Submit Attendance';return;}"
            + "try{"
            + "var resp=await fetch('" + backendUrl + "/attendance/submit',{"
            + "method:'POST',headers:{'Content-Type':'application/json'},"
            + "body:JSON.stringify({sessionId:'" + sessionId + "',name:name,rollNumber:roll,email:email})"
            + "});"
            + "var data=await resp.json();"
            + "if(data.success){"
            + "document.getElementById('formCard').style.display='none';"
            + "var info='<div class=\"info-row\"><span class=\"lbl\">Name</span><span class=\"val\">'+name+'</span></div>';"
            + "info+='<div class=\"info-row\"><span class=\"lbl\">Roll Number</span><span class=\"val\">'+roll+'</span></div>';"
            + "info+='<div class=\"info-row\"><span class=\"lbl\">Subject</span><span class=\"val\">" + subjectName + "</span></div>';"
            + "info+='<div class=\"info-row\"><span class=\"lbl\">Faculty</span><span class=\"val\">" + facultyName + "</span></div>';"
            + "document.getElementById('successInfo').innerHTML=info;"
            + "document.getElementById('successCard').style.display='block';"
            + "}else{"
            + "errDiv.textContent=data.message||'Submission failed';errDiv.style.display='block';"
            + "btn.disabled=false;btn.textContent='Submit Attendance';"
            + "}"
            + "}catch(err){"
            + "errDiv.textContent='Network error. Please try again.';errDiv.style.display='block';"
            + "btn.disabled=false;btn.textContent='Submit Attendance';"
            + "}"
            + "}"
            + "</script></body></html>";

        sendHtml(exchange, 200, html);
    }

    private static String errorPage(String title, String message) {
        return "<!DOCTYPE html><html lang='en'><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width,initial-scale=1.0'>"
            + "<title>" + title + "</title>"
            + "<style>"
            + "*{margin:0;padding:0;box-sizing:border-box}"
            + "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#030712;color:#e5e7eb;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px}"
            + ".card{background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;width:100%;max-width:420px;text-align:center}"
            + ".icon{width:64px;height:64px;border-radius:50%;background:rgba(239,68,68,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto 16px}"
            + ".icon svg{width:32px;height:32px;stroke:#f87171;fill:none;stroke-width:2}"
            + "h1{font-size:20px;color:#f3f4f6;margin-bottom:8px}"
            + "p{font-size:14px;color:#6b7280}"
            + "</style></head><body>"
            + "<div class='card'>"
            + "<div class='icon'><svg viewBox='0 0 24 24'><circle cx='12' cy='12' r='10'/><line x1='15' y1='9' x2='9' y2='15'/><line x1='9' y1='9' x2='15' y2='15'/></svg></div>"
            + "<h1>" + title + "</h1>"
            + "<p>" + message + "</p>"
            + "</div></body></html>";
    }

    private static void sendHtml(HttpExchange exchange, int code, String html) throws Exception {
        byte[] bytes = html.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.sendResponseHeaders(code, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    // ==================== ATTENDANCE SESSIONS ====================

    private static void handleCreateAttendanceSession(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("facultyId") || !req.has("subjectId")) {
            sendError(exchange, 400, "Faculty ID and subject ID are required");
            return;
        }

        String facultyId = req.get("facultyId").getAsString().trim();
        String subjectId = req.get("subjectId").getAsString().trim();

        if (facultyId.isEmpty() || subjectId.isEmpty()) {
            sendError(exchange, 400, "Faculty ID and subject ID cannot be empty");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();

        // Verify faculty exists
        Document faculty = db.getCollection("users").find(new Document("_id", new ObjectId(facultyId))).first();
        if (faculty == null) {
            sendError(exchange, 404, "Faculty not found");
            return;
        }

        // Verify subject exists
        Document subject = db.getCollection("subjects").find(new Document("_id", new ObjectId(subjectId))).first();
        if (subject == null) {
            sendError(exchange, 404, "Subject not found");
            return;
        }

        // Generate a unique short session code
        String sessionCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // Session expires in 10 minutes
        long expiresAt = System.currentTimeMillis() + (10 * 60 * 1000);

        // Get department info from subject
        String deptName = "";
        if (subject.get("departmentId") != null) {
            try {
                Document dept = db.getCollection("departments")
                    .find(new Document("_id", subject.get("departmentId"))).first();
                if (dept != null) deptName = dept.getString("deptName");
            } catch (Exception e) { /* ignore */ }
        }

        Document session = new Document()
            .append("sessionCode", sessionCode)
            .append("facultyId", facultyId)
            .append("facultyName", faculty.getString("name"))
            .append("subjectId", subjectId)
            .append("subjectName", subject.getString("subjectName"))
            .append("subjectCode", subject.getString("subjectCode"))
            .append("departmentName", deptName)
            .append("isActive", true)
            .append("expiresAt", new Date(expiresAt))
            .append("createdAt", new Date());

        db.getCollection("attendance_sessions").insertOne(session);
        String sessionId = session.getObjectId("_id").toHexString();

        // Generate QR code as base64 PNG — points to backend directly (no Vite needed)
        String attendanceUrl = "http://" + LOCAL_IP + ":8080/attend/" + sessionId;
        String qrBase64 = generateQRBase64(attendanceUrl, 300, 300);

        System.out.println("  Attendance session created: " + sessionCode + " for " + subject.getString("subjectName"));

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Attendance session created");
        res.addProperty("sessionId", sessionId);
        res.addProperty("sessionCode", sessionCode);
        res.addProperty("qrCodeBase64", qrBase64);
        res.addProperty("attendanceUrl", attendanceUrl);
        res.addProperty("expiresAt", new Date(expiresAt).toString());
        res.addProperty("subjectName", subject.getString("subjectName"));
        sendJson(exchange, 200, res);
    }

    private static void handleGetAttendanceSessions(HttpExchange exchange) throws Exception {
        String query = exchange.getRequestURI().getQuery();
        String facultyId = null;
        if (query != null) {
            for (String param : query.split("&")) {
                String[] kv = param.split("=");
                if (kv.length == 2 && "facultyId".equals(kv[0])) {
                    facultyId = kv[1];
                }
            }
        }

        MongoDatabase db = MongoDBConnection.getDatabase();
        Document filter = new Document();
        if (facultyId != null && !facultyId.isEmpty()) {
            filter.append("facultyId", facultyId);
        }

        List<Document> docs = db.getCollection("attendance_sessions")
            .find(filter).sort(new Document("createdAt", -1)).limit(50).into(new ArrayList<>());

        JsonArray arr = new JsonArray();
        for (Document d : docs) {
            JsonObject s = new JsonObject();
            s.addProperty("id", d.getObjectId("_id").toHexString());
            s.addProperty("sessionCode", d.getString("sessionCode"));
            s.addProperty("facultyId", d.getString("facultyId"));
            s.addProperty("facultyName", d.getString("facultyName"));
            s.addProperty("subjectId", d.getString("subjectId"));
            s.addProperty("subjectName", d.getString("subjectName"));
            s.addProperty("subjectCode", d.getString("subjectCode"));
            s.addProperty("departmentName", d.getString("departmentName") != null ? d.getString("departmentName") : "");
            s.addProperty("isActive", d.getBoolean("isActive", false));
            Date expires = d.getDate("expiresAt");
            boolean expired = expires != null && expires.before(new Date());
            s.addProperty("isExpired", expired);
            Date created = d.getDate("createdAt");
            s.addProperty("createdAt", created != null ? created.toString() : "");

            // Count submissions for this session
            long count = db.getCollection("attendance_records")
                .countDocuments(new Document("sessionId", d.getObjectId("_id").toHexString()));
            s.addProperty("submissionCount", count);

            arr.add(s);
        }

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.add("data", arr);
        sendJson(exchange, 200, res);
    }

    private static void handleGetSessionInfo(HttpExchange exchange, String sessionId) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();

        Document session;
        try {
            session = db.getCollection("attendance_sessions")
                .find(new Document("_id", new ObjectId(sessionId))).first();
        } catch (Exception e) {
            sendError(exchange, 400, "Invalid session ID");
            return;
        }

        if (session == null) {
            sendError(exchange, 404, "Attendance session not found");
            return;
        }

        Date expires = session.getDate("expiresAt");
        boolean expired = expires != null && expires.before(new Date());

        JsonObject res = new JsonObject();
        res.addProperty("success", true);

        JsonObject data = new JsonObject();
        data.addProperty("id", session.getObjectId("_id").toHexString());
        data.addProperty("sessionCode", session.getString("sessionCode"));
        data.addProperty("facultyName", session.getString("facultyName"));
        data.addProperty("subjectName", session.getString("subjectName"));
        data.addProperty("subjectCode", session.getString("subjectCode"));
        data.addProperty("departmentName", session.getString("departmentName") != null ? session.getString("departmentName") : "");
        data.addProperty("isActive", session.getBoolean("isActive", false));
        data.addProperty("isExpired", expired);
        Date created = session.getDate("createdAt");
        data.addProperty("createdAt", created != null ? created.toString() : "");

        res.add("data", data);
        sendJson(exchange, 200, res);
    }

    private static void handleSubmitAttendance(HttpExchange exchange) throws Exception {
        String body = readBody(exchange);
        JsonObject req = gson.fromJson(body, JsonObject.class);

        if (!req.has("sessionId") || !req.has("rollNumber") || !req.has("name")) {
            sendError(exchange, 400, "Session ID, roll number, and name are required");
            return;
        }

        String sessionId = req.get("sessionId").getAsString().trim();
        String rollNumber = req.get("rollNumber").getAsString().trim().toUpperCase();
        String name = req.get("name").getAsString().trim();
        String email = req.has("email") && !req.get("email").isJsonNull() ? req.get("email").getAsString().trim() : "";

        if (sessionId.isEmpty() || rollNumber.isEmpty() || name.isEmpty()) {
            sendError(exchange, 400, "Session ID, roll number, and name cannot be empty");
            return;
        }

        MongoDatabase db = MongoDBConnection.getDatabase();

        // Verify session exists and is still active
        Document session;
        try {
            session = db.getCollection("attendance_sessions")
                .find(new Document("_id", new ObjectId(sessionId))).first();
        } catch (Exception e) {
            sendError(exchange, 400, "Invalid session ID");
            return;
        }

        if (session == null) {
            sendError(exchange, 404, "Attendance session not found");
            return;
        }

        if (!session.getBoolean("isActive", false)) {
            sendError(exchange, 400, "This attendance session has been closed");
            return;
        }

        Date expires = session.getDate("expiresAt");
        if (expires != null && expires.before(new Date())) {
            sendError(exchange, 400, "This attendance session has expired");
            return;
        }

        // Check if student is enrolled in the system
        Document student = db.getCollection("students")
            .find(new Document("rollNumber", rollNumber)).first();

        boolean isEnrolled = false;

        if (student != null) {
            isEnrolled = true;
        } else {
            // Auto-create student in the students collection
            String deptId = "";
            // Try to get department from the session's subject
            String subjId = session.getString("subjectId");
            if (subjId != null && !subjId.isEmpty()) {
                try {
                    Document subj = db.getCollection("subjects").find(new Document("_id", new ObjectId(subjId))).first();
                    if (subj != null && subj.get("departmentId") != null) {
                        deptId = subj.get("departmentId").toString();
                    }
                } catch (Exception e) { /* ignore */ }
            }
            Document newStudent = new Document()
                .append("name", name)
                .append("rollNumber", rollNumber)
                .append("email", email)
                .append("departmentId", deptId)
                .append("semester", 1)
                .append("section", "A")
                .append("createdAt", new Date());
            db.getCollection("students").insertOne(newStudent);
            isEnrolled = true;
            System.out.println("  Auto-created student: " + name + " (" + rollNumber + ")");
        }

        // Check for duplicate submission
        Document existingSubmission = db.getCollection("attendance_records")
            .find(new Document("sessionId", sessionId).append("rollNumber", rollNumber)).first();

        if (existingSubmission != null) {
            sendError(exchange, 409, "Attendance already submitted for roll number " + rollNumber);
            return;
        }

        // Create attendance record
        Document record = new Document()
            .append("sessionId", sessionId)
            .append("rollNumber", rollNumber)
            .append("name", name)
            .append("email", email)
            .append("isEnrolled", isEnrolled)
            .append("subjectName", session.getString("subjectName"))
            .append("subjectCode", session.getString("subjectCode"))
            .append("facultyName", session.getString("facultyName"))
            .append("submittedAt", new Date());

        db.getCollection("attendance_records").insertOne(record);
        System.out.println("  Attendance submitted: " + rollNumber + " - " + name + " for session " + session.getString("sessionCode"));

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.addProperty("message", "Attendance recorded successfully for " + name + " (" + rollNumber + ")");
        res.addProperty("isEnrolled", isEnrolled);
        sendJson(exchange, 200, res);
    }

    private static void handleGetAttendanceRecords(HttpExchange exchange, String sessionId) throws Exception {
        MongoDatabase db = MongoDBConnection.getDatabase();

        // Verify session exists
        Document session;
        try {
            session = db.getCollection("attendance_sessions")
                .find(new Document("_id", new ObjectId(sessionId))).first();
        } catch (Exception e) {
            sendError(exchange, 400, "Invalid session ID");
            return;
        }

        if (session == null) {
            sendError(exchange, 404, "Session not found");
            return;
        }

        List<Document> docs = db.getCollection("attendance_records")
            .find(new Document("sessionId", sessionId))
            .sort(new Document("submittedAt", -1))
            .into(new ArrayList<>());

        JsonArray arr = new JsonArray();
        for (Document d : docs) {
            JsonObject r = new JsonObject();
            r.addProperty("id", d.getObjectId("_id").toHexString());
            r.addProperty("rollNumber", d.getString("rollNumber"));
            r.addProperty("name", d.getString("name"));
            r.addProperty("email", d.getString("email") != null ? d.getString("email") : "");
            r.addProperty("isEnrolled", d.getBoolean("isEnrolled", false));
            Date submitted = d.getDate("submittedAt");
            r.addProperty("submittedAt", submitted != null ? submitted.toString() : "");
            arr.add(r);
        }

        JsonObject sessionInfo = new JsonObject();
        sessionInfo.addProperty("sessionCode", session.getString("sessionCode"));
        sessionInfo.addProperty("subjectName", session.getString("subjectName"));
        sessionInfo.addProperty("subjectCode", session.getString("subjectCode"));
        sessionInfo.addProperty("facultyName", session.getString("facultyName"));

        JsonObject res = new JsonObject();
        res.addProperty("success", true);
        res.add("session", sessionInfo);
        res.add("data", arr);
        res.addProperty("totalPresent", arr.size());
        sendJson(exchange, 200, res);
    }

    private static String generateQRBase64(String text, int width, int height) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix matrix = writer.encode(text, BarcodeFormat.QR_CODE, width, height);
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", baos);
            return Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (Exception e) {
            System.err.println("QR generation error: " + e.getMessage());
            return "";
        }
    }

    // ==================== HELPERS ====================

    private static void sendJson(HttpExchange exchange, int code, JsonObject json) throws Exception {
        String response = json.toString();
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(code, response.getBytes(StandardCharsets.UTF_8).length);
        OutputStream os = exchange.getResponseBody();
        os.write(response.getBytes(StandardCharsets.UTF_8));
        os.close();
    }

    private static void sendError(HttpExchange exchange, int code, String message) throws Exception {
        JsonObject error = new JsonObject();
        error.addProperty("success", false);
        error.addProperty("message", message);
        sendJson(exchange, code, error);
    }
}
