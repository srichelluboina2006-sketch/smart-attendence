package com.smartattendance.servlets;

import com.smartattendance.config.DBConnection;
import com.smartattendance.util.JsonUtil;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@WebServlet("/faculty/*")
public class FacultyServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getPathInfo();
        if (action == null) action = "/";

        switch (action) {
            case "/students": fetchStudentList(req, resp); break;
            case "/attendance": fetchAttendanceRecords(req, resp); break;
            case "/reports": fetchAttendanceReport(req, resp); break;
            case "/marks": fetchMarksData(req, resp); break;
            case "/resources": fetchResources(req, resp); break;
            case "/timetable": fetchTimetable(req, resp); break;
            case "/profile": fetchFacultyProfile(req, resp); break;
            default: JsonUtil.sendError(resp, 404, "Faculty GET endpoint not found");
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getPathInfo();
        if (action == null) action = "/";

        switch (action) {
            case "/qr": generateQRSession(req, resp); break;
            case "/attendance": markAttendance(req, resp); break;
            case "/marks": submitMarks(req, resp); break;
            case "/resources": uploadResource(req, resp); break;
            default: JsonUtil.sendError(resp, 404, "Faculty POST endpoint not found");
        }
    }

    private void fetchFacultyProfile(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        ResultSet rs = null;
        try {
            int userId = (int) req.getAttribute("userId");
            conn = DBConnection.getConnection();
            ps = conn.prepareStatement(
                "SELECT u.id, u.name, u.username, u.email, u.department_id, d.dept_name, " +
                "COUNT(DISTINCT s.id) as subject_count FROM users u " +
                "LEFT JOIN departments d ON u.department_id = d.id " +
                "LEFT JOIN subjects s ON s.faculty_id = u.id " +
                "WHERE u.id = ? GROUP BY u.id");
            ps.setInt(1, userId);
            rs = ps.executeQuery();

            if (rs.next()) {
                Map<String, Object> profile = new HashMap<>();
                profile.put("id", rs.getInt("id"));
                profile.put("name", rs.getString("name"));
                profile.put("username", rs.getString("username"));
                profile.put("email", rs.getString("email"));
                profile.put("departmentName", rs.getString("dept_name"));
                profile.put("subjectCount", rs.getInt("subject_count"));
                JsonUtil.sendSuccess(resp, "Profile fetched", profile);
            } else {
                JsonUtil.sendError(resp, 404, "Faculty not found");
            }
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, ps, conn);
        }
    }

    private void generateQRSession(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            String body = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(body).getAsJsonObject();
            int facultyId = (int) req.getAttribute("userId");
            int subjectId = payload.get("subjectId").getAsInt();

            String sessionId = UUID.randomUUID().toString();
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5);

            conn = DBConnection.getConnection();
            ps = conn.prepareStatement(
                "INSERT INTO qr_sessions (session_id, subject_id, faculty_id, qr_data, expires_at) VALUES (?, ?, ?, ?, ?)");
            ps.setString(1, sessionId);
            ps.setInt(2, subjectId);
            ps.setInt(3, facultyId);
            ps.setString(4, sessionId);
            ps.setTimestamp(5, Timestamp.valueOf(expiresAt));
            ps.executeUpdate();

            Map<String, Object> result = new HashMap<>();
            result.put("sessionId", sessionId);
            result.put("expiresAt", expiresAt.toString());
            result.put("qrData", sessionId);
            JsonUtil.sendSuccess(resp, "QR session created - valid for 5 minutes", result);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(ps, conn);
        }
    }

    private void fetchStudentList(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT s.id, s.name, s.regno, s.email, s.phone, s.year, s.section, d.dept_name " +
                "FROM students s LEFT JOIN departments d ON s.department_id = d.id " +
                "WHERE s.is_active = TRUE ORDER BY s.name");

            List<Map<String, Object>> studentsList = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> student = new HashMap<>();
                student.put("id", rs.getInt("id"));
                student.put("name", rs.getString("name"));
                student.put("regno", rs.getString("regno"));
                student.put("email", rs.getString("email"));
                student.put("phone", rs.getString("phone"));
                student.put("year", rs.getInt("year"));
                student.put("section", rs.getString("section"));
                student.put("departmentName", rs.getString("dept_name"));
                studentsList.add(student);
            }
            JsonUtil.sendSuccess(resp, "Students fetched", studentsList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }

    private void markAttendance(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            String body = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(body).getAsJsonObject();
            int facultyId = (int) req.getAttribute("userId");

            int studentId = payload.get("studentId").getAsInt();
            int subjectId = payload.get("subjectId").getAsInt();
            String status = payload.get("status").getAsString();
            String sessionId = payload.has("sessionId") ? payload.get("sessionId").getAsString() : null;

            conn = DBConnection.getConnection();
            ps = conn.prepareStatement(
                "INSERT INTO attendance (student_id, subject_id, date, status, session_id, marked_by) " +
                "VALUES (?, ?, CURDATE(), ?, ?, ?)");
            ps.setInt(1, studentId);
            ps.setInt(2, subjectId);
            ps.setString(3, status);
            ps.setString(4, sessionId);
            ps.setInt(5, facultyId);
            ps.executeUpdate();

            JsonUtil.sendSuccess(resp, "Attendance marked successfully", null);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(ps, conn);
        }
    }

    private void fetchAttendanceRecords(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT a.id, a.date, a.status, s.name, s.regno, sub.subject_name " +
                "FROM attendance a JOIN students s ON a.student_id = s.id " +
                "JOIN subjects sub ON a.subject_id = sub.id ORDER BY a.date DESC LIMIT 100");

            List<Map<String, Object>> attendanceList = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> record = new HashMap<>();
                record.put("id", rs.getInt("id"));
                record.put("date", rs.getString("date"));
                record.put("status", rs.getString("status"));
                record.put("studentName", rs.getString("name"));
                record.put("studentRegno", rs.getString("regno"));
                record.put("subjectName", rs.getString("subject_name"));
                attendanceList.add(record);
            }
            JsonUtil.sendSuccess(resp, "Attendance records fetched", attendanceList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }

    private void fetchAttendanceReport(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        CallableStatement cs = null;
        ResultSet rs = null;
        try {
            int studentId = Integer.parseInt(req.getParameter("studentId"));
            conn = DBConnection.getConnection();
            cs = conn.prepareCall("{CALL GetStudentAttendance(?, NULL)}");
            cs.setInt(1, studentId);
            rs = cs.executeQuery();

            List<Map<String, Object>> reportList = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> row = new HashMap<>();
                row.put("studentName", rs.getString("student_name"));
                row.put("regno", rs.getString("regno"));
                row.put("subjectName", rs.getString("subject_name"));
                row.put("totalClasses", rs.getInt("total_classes"));
                row.put("presentCount", rs.getInt("present_count"));
                row.put("percentage", rs.getDouble("percentage"));
                reportList.add(row);
            }
            JsonUtil.sendSuccess(resp, "Attendance report generated", reportList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, cs, conn);
        }
    }

    private void submitMarks(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            String body = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(body).getAsJsonObject();
            int facultyId = (int) req.getAttribute("userId");

            int studentId = payload.get("studentId").getAsInt();
            int subjectId = payload.get("subjectId").getAsInt();
            String marksType = payload.get("marksType").getAsString();
            double marksObtained = payload.get("marksObtained").getAsDouble();

            conn = DBConnection.getConnection();
            ps = conn.prepareStatement(
                "INSERT INTO marks (student_id, subject_id, marks_type, marks_obtained, entered_by) " +
                "VALUES (?, ?, ?, ?, ?)");
            ps.setInt(1, studentId);
            ps.setInt(2, subjectId);
            ps.setString(3, marksType);
            ps.setDouble(4, marksObtained);
            ps.setInt(5, facultyId);
            ps.executeUpdate();

            JsonUtil.sendSuccess(resp, "Marks submitted successfully", null);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(ps, conn);
        }
    }

    private void fetchMarksData(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT m.id, m.marks_type, m.marks_obtained, m.max_marks, s.name, s.regno, sub.subject_name " +
                "FROM marks m JOIN students s ON m.student_id = s.id " +
                "JOIN subjects sub ON m.subject_id = sub.id ORDER BY m.id DESC LIMIT 100");

            List<Map<String, Object>> marksList = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> mark = new HashMap<>();
                mark.put("id", rs.getInt("id"));
                mark.put("marksType", rs.getString("marks_type"));
                mark.put("marksObtained", rs.getDouble("marks_obtained"));
                mark.put("maxMarks", rs.getDouble("max_marks"));
                mark.put("studentName", rs.getString("name"));
                mark.put("studentRegno", rs.getString("regno"));
                mark.put("subjectName", rs.getString("subject_name"));
                marksList.add(mark);
            }
            JsonUtil.sendSuccess(resp, "Marks data fetched", marksList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }

    private void uploadResource(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            String body = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(body).getAsJsonObject();
            int facultyId = (int) req.getAttribute("userId");

            String title = payload.get("title").getAsString();
            String filePath = payload.get("filePath").getAsString();
            String fileType = payload.get("fileType").getAsString();
            int subjectId = payload.get("subjectId").getAsInt();

            conn = DBConnection.getConnection();
            ps = conn.prepareStatement(
                "INSERT INTO resources (title, file_path, file_type, subject_id, uploaded_by) VALUES (?, ?, ?, ?, ?)");
            ps.setString(1, title);
            ps.setString(2, filePath);
            ps.setString(3, fileType);
            ps.setInt(4, subjectId);
            ps.setInt(5, facultyId);
            ps.executeUpdate();

            JsonUtil.sendSuccess(resp, "Resource uploaded successfully", null);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(ps, conn);
        }
    }

    private void fetchResources(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT r.id, r.title, r.file_type, r.created_at, sub.subject_name, u.name as uploader_name " +
                "FROM resources r JOIN subjects sub ON r.subject_id = sub.id " +
                "JOIN users u ON r.uploaded_by = u.id ORDER BY r.created_at DESC");

            List<Map<String, Object>> resourcesList = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> resource = new HashMap<>();
                resource.put("id", rs.getInt("id"));
                resource.put("title", rs.getString("title"));
                resource.put("fileType", rs.getString("file_type"));
                resource.put("subjectName", rs.getString("subject_name"));
                resource.put("uploaderName", rs.getString("uploader_name"));
                resource.put("createdAt", rs.getString("created_at"));
                resourcesList.add(resource);
            }
            JsonUtil.sendSuccess(resp, "Resources fetched", resourcesList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }

    private void fetchTimetable(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT t.id, t.day_of_week, t.start_time, t.end_time, t.room, sub.subject_name, u.name as faculty_name " +
                "FROM timetable t JOIN subjects sub ON t.subject_id = sub.id " +
                "JOIN users u ON t.faculty_id = u.id ORDER BY FIELD(t.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'), t.start_time");

            List<Map<String, Object>> timetableList = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> slot = new HashMap<>();
                slot.put("id", rs.getInt("id"));
                slot.put("dayOfWeek", rs.getString("day_of_week"));
                slot.put("startTime", rs.getString("start_time"));
                slot.put("endTime", rs.getString("end_time"));
                slot.put("room", rs.getString("room"));
                slot.put("subjectName", rs.getString("subject_name"));
                slot.put("facultyName", rs.getString("faculty_name"));
                timetableList.add(slot);
            }
            JsonUtil.sendSuccess(resp, "Timetable fetched", timetableList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }
}
