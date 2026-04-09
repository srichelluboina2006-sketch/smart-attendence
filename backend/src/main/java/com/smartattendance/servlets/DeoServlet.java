package com.smartattendance.servlets;

import com.smartattendance.config.DBConnection;
import com.smartattendance.util.JsonUtil;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;

import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.sql.*;
import java.util.*;

@WebServlet("/deo/*")
public class DeoServlet extends HttpServlet {

    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getPathInfo();
        if (action == null) action = "/";

        switch (action) {
            case "/students": fetchAllStudents(req, resp); break;
            case "/marks": fetchAllMarks(req, resp); break;
            case "/attendance": fetchAttendanceData(req, resp); break;
            case "/exam": fetchExamSchedules(req, resp); break;
            case "/reports": generateDataReport(req, resp); break;
            case "/verify": fetchUnverifiedData(req, resp); break;
            default: JsonUtil.sendError(resp, 404, "DEO GET endpoint not found");
        }
    }

    @Override
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getPathInfo();
        if (action == null) action = "/";

        switch (action) {
            case "/students": addNewStudent(req, resp); break;
            case "/marks": addMarksEntry(req, resp); break;
            case "/attendance": uploadAttendanceData(req, resp); break;
            case "/exam": createExamSchedule(req, resp); break;
            default: JsonUtil.sendError(resp, 404, "DEO POST endpoint not found");
        }
    }

    @Override
    protected void doPut(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        String action = req.getPathInfo();
        if (action != null && action.startsWith("/students/")) {
            updateStudentRecord(req, resp);
        } else {
            JsonUtil.sendError(resp, 404, "DEO PUT endpoint not found");
        }
    }

    private void fetchAllStudents(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT s.id, s.name, s.regno, s.email, s.phone, s.year, s.section, s.semester, " +
                "d.dept_name, s.is_active, s.created_at FROM students s " +
                "LEFT JOIN departments d ON s.department_id = d.id ORDER BY s.id");

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
                student.put("semester", rs.getString("semester"));
                student.put("departmentName", rs.getString("dept_name"));
                student.put("isActive", rs.getBoolean("is_active"));
                student.put("createdAt", rs.getString("created_at"));
                studentsList.add(student);
            }
            JsonUtil.sendSuccess(resp, "All students fetched", studentsList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }

    private void addNewStudent(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            String body = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(body).getAsJsonObject();

            String name = payload.get("name").getAsString();
            String regno = payload.get("regno").getAsString();
            String email = payload.has("email") ? payload.get("email").getAsString() : "";
            String phone = payload.has("phone") ? payload.get("phone").getAsString() : "";
            int deptId = payload.has("departmentId") ? payload.get("departmentId").getAsInt() : 0;
            int year = payload.has("year") ? payload.get("year").getAsInt() : 1;
            String section = payload.has("section") ? payload.get("section").getAsString() : "A";
            String semester = payload.has("semester") ? payload.get("semester").getAsString() : "1";

            conn = DBConnection.getConnection();
            ps = conn.prepareStatement(
                "INSERT INTO students (name, regno, email, phone, department_id, year, section, semester) " +
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, name);
            ps.setString(2, regno);
            ps.setString(3, email);
            ps.setString(4, phone);
            if (deptId > 0) ps.setInt(5, deptId); else ps.setNull(5, Types.INTEGER);
            ps.setInt(6, year);
            ps.setString(7, section);
            ps.setString(8, semester);
            ps.executeUpdate();

            ResultSet keysRs = ps.getGeneratedKeys();
            int newId = keysRs.next() ? keysRs.getInt(1) : 0;

            Map<String, Object> result = new HashMap<>();
            result.put("id", newId);
            result.put("name", name);
            result.put("regno", regno);
            JsonUtil.sendSuccess(resp, "Student added successfully", result);
        } catch (SQLIntegrityConstraintViolationException e) {
            JsonUtil.sendError(resp, 409, "Registration number already exists");
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(ps, conn);
        }
    }

    private void updateStudentRecord(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            String idStr = req.getPathInfo().replace("/students/", "");
            int studentId = Integer.parseInt(idStr);
            String body = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(body).getAsJsonObject();

            conn = DBConnection.getConnection();
            StringBuilder sql = new StringBuilder("UPDATE students SET ");
            List<Object> params = new ArrayList<>();

            if (payload.has("name")) { sql.append("name = ?, "); params.add(payload.get("name").getAsString()); }
            if (payload.has("email")) { sql.append("email = ?, "); params.add(payload.get("email").getAsString()); }
            if (payload.has("phone")) { sql.append("phone = ?, "); params.add(payload.get("phone").getAsString()); }
            if (payload.has("year")) { sql.append("year = ?, "); params.add(payload.get("year").getAsInt()); }
            if (payload.has("section")) { sql.append("section = ?, "); params.add(payload.get("section").getAsString()); }
            if (payload.has("semester")) { sql.append("semester = ?, "); params.add(payload.get("semester").getAsString()); }
            if (payload.has("isActive")) { sql.append("is_active = ?, "); params.add(payload.get("isActive").getAsBoolean()); }

            String sqlStr = sql.toString().replaceAll(", $", "") + " WHERE id = ?";
            ps = conn.prepareStatement(sqlStr);
            for (int i = 0; i < params.size(); i++) {
                Object val = params.get(i);
                if (val instanceof String) ps.setString(i + 1, (String) val);
                else if (val instanceof Integer) ps.setInt(i + 1, (Integer) val);
                else if (val instanceof Boolean) ps.setBoolean(i + 1, (Boolean) val);
            }
            ps.setInt(params.size() + 1, studentId);
            int affected = ps.executeUpdate();

            if (affected > 0) {
                JsonUtil.sendSuccess(resp, "Student record updated", null);
            } else {
                JsonUtil.sendError(resp, 404, "Student not found");
            }
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(ps, conn);
        }
    }

    private void fetchAllMarks(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT m.id, m.marks_type, m.marks_obtained, m.max_marks, m.semester, " +
                "s.name, s.regno, sub.subject_name, u.name as entered_by FROM marks m " +
                "JOIN students s ON m.student_id = s.id JOIN subjects sub ON m.subject_id = sub.id " +
                "LEFT JOIN users u ON m.entered_by = u.id ORDER BY m.id DESC");

            List<Map<String, Object>> marksList = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> mark = new HashMap<>();
                mark.put("id", rs.getInt("id"));
                mark.put("marksType", rs.getString("marks_type"));
                mark.put("marksObtained", rs.getDouble("marks_obtained"));
                mark.put("maxMarks", rs.getDouble("max_marks"));
                mark.put("semester", rs.getString("semester"));
                mark.put("studentName", rs.getString("name"));
                mark.put("studentRegno", rs.getString("regno"));
                mark.put("subjectName", rs.getString("subject_name"));
                mark.put("enteredBy", rs.getString("entered_by"));
                marksList.add(mark);
            }
            JsonUtil.sendSuccess(resp, "All marks fetched", marksList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }

    private void addMarksEntry(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            String body = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(body).getAsJsonObject();
            int deoId = (int) req.getAttribute("userId");

            int studentId = payload.get("studentId").getAsInt();
            int subjectId = payload.get("subjectId").getAsInt();
            String marksType = payload.get("marksType").getAsString();
            double marksObtained = payload.get("marksObtained").getAsDouble();
            String semester = payload.has("semester") ? payload.get("semester").getAsString() : "1";

            conn = DBConnection.getConnection();
            ps = conn.prepareStatement(
                "INSERT INTO marks (student_id, subject_id, marks_type, marks_obtained, semester, entered_by) " +
                "VALUES (?, ?, ?, ?, ?, ?)");
            ps.setInt(1, studentId);
            ps.setInt(2, subjectId);
            ps.setString(3, marksType);
            ps.setDouble(4, marksObtained);
            ps.setString(5, semester);
            ps.setInt(6, deoId);
            ps.executeUpdate();

            JsonUtil.sendSuccess(resp, "Marks entry added", null);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(ps, conn);
        }
    }

    private void fetchAttendanceData(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT a.id, a.date, a.status, s.name, s.regno, sub.subject_name FROM attendance a " +
                "JOIN students s ON a.student_id = s.id JOIN subjects sub ON a.subject_id = sub.id " +
                "ORDER BY a.date DESC LIMIT 200");

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
            JsonUtil.sendSuccess(resp, "Attendance data fetched", attendanceList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }

    private void uploadAttendanceData(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            String body = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(body).getAsJsonObject();

            int studentId = payload.get("studentId").getAsInt();
            int subjectId = payload.get("subjectId").getAsInt();
            String date = payload.get("date").getAsString();
            String status = payload.get("status").getAsString();

            conn = DBConnection.getConnection();
            ps = conn.prepareStatement(
                "INSERT INTO attendance (student_id, subject_id, date, status) VALUES (?, ?, ?, ?)");
            ps.setInt(1, studentId);
            ps.setInt(2, subjectId);
            ps.setString(3, date);
            ps.setString(4, status);
            ps.executeUpdate();

            JsonUtil.sendSuccess(resp, "Attendance uploaded", null);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(ps, conn);
        }
    }

    private void fetchExamSchedules(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT e.id, e.exam_date, e.start_time, e.end_time, e.room, e.exam_type, sub.subject_name " +
                "FROM exam_schedule e JOIN subjects sub ON e.subject_id = sub.id ORDER BY e.exam_date");

            List<Map<String, Object>> examsList = new ArrayList<>();
            while (rs.next()) {
                Map<String, Object> exam = new HashMap<>();
                exam.put("id", rs.getInt("id"));
                exam.put("examDate", rs.getString("exam_date"));
                exam.put("startTime", rs.getString("start_time"));
                exam.put("endTime", rs.getString("end_time"));
                exam.put("room", rs.getString("room"));
                exam.put("examType", rs.getString("exam_type"));
                exam.put("subjectName", rs.getString("subject_name"));
                examsList.add(exam);
            }
            JsonUtil.sendSuccess(resp, "Exam schedules fetched", examsList);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }

    private void createExamSchedule(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        PreparedStatement ps = null;
        try {
            String body = JsonUtil.readRequestBody(req);
            JsonObject payload = JsonParser.parseString(body).getAsJsonObject();

            int subjectId = payload.get("subjectId").getAsInt();
            String examDate = payload.get("examDate").getAsString();
            String startTime = payload.get("startTime").getAsString();
            String endTime = payload.get("endTime").getAsString();
            String room = payload.has("room") ? payload.get("room").getAsString() : "";
            String examType = payload.has("examType") ? payload.get("examType").getAsString() : "internal";

            conn = DBConnection.getConnection();
            ps = conn.prepareStatement(
                "INSERT INTO exam_schedule (subject_id, exam_date, start_time, end_time, room, exam_type) " +
                "VALUES (?, ?, ?, ?, ?, ?)");
            ps.setInt(1, subjectId);
            ps.setString(2, examDate);
            ps.setString(3, startTime);
            ps.setString(4, endTime);
            ps.setString(5, room);
            ps.setString(6, examType);
            ps.executeUpdate();

            JsonUtil.sendSuccess(resp, "Exam schedule created", null);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(ps, conn);
        }
    }

    private void generateDataReport(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();
            rs = stmt.executeQuery(
                "SELECT COUNT(DISTINCT s.id) as total_students, COUNT(DISTINCT m.id) as total_marks, " +
                "COUNT(DISTINCT a.id) as total_attendance, COUNT(DISTINCT e.id) as total_exams " +
                "FROM students s LEFT JOIN marks m ON s.id = m.student_id " +
                "LEFT JOIN attendance a ON s.id = a.student_id LEFT JOIN exam_schedule e ON 1=1");

            Map<String, Object> report = new HashMap<>();
            if (rs.next()) {
                report.put("totalStudents", rs.getInt("total_students"));
                report.put("totalMarksEntries", rs.getInt("total_marks"));
                report.put("totalAttendanceRecords", rs.getInt("total_attendance"));
                report.put("totalExamSchedules", rs.getInt("total_exams"));
            }
            JsonUtil.sendSuccess(resp, "Data report generated", report);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }

    private void fetchUnverifiedData(HttpServletRequest req, HttpServletResponse resp) throws IOException {
        Connection conn = null;
        Statement stmt = null;
        ResultSet rs = null;
        try {
            conn = DBConnection.getConnection();
            stmt = conn.createStatement();

            Map<String, Object> verification = new HashMap<>();

            // Check for students with missing email
            rs = stmt.executeQuery("SELECT COUNT(*) as cnt FROM students WHERE email IS NULL OR email = ''");
            if (rs.next()) verification.put("studentsWithoutEmail", rs.getInt("cnt"));

            // Check for marks without proper entry
            rs = stmt.executeQuery("SELECT COUNT(*) as cnt FROM marks WHERE marks_obtained > max_marks");
            if (rs.next()) verification.put("invalidMarksEntries", rs.getInt("cnt"));

            // Check for duplicate attendance on same day
            rs = stmt.executeQuery(
                "SELECT COUNT(*) as cnt FROM attendance WHERE id NOT IN " +
                "(SELECT MAX(id) FROM attendance GROUP BY student_id, subject_id, date)");
            if (rs.next()) verification.put("duplicateAttendance", rs.getInt("cnt"));

            JsonUtil.sendSuccess(resp, "Data verification report", verification);
        } catch (SQLException e) {
            JsonUtil.sendError(resp, 500, "DB error: " + e.getMessage());
        } finally {
            DBConnection.closeQuietly(rs, stmt, conn);
        }
    }
}
