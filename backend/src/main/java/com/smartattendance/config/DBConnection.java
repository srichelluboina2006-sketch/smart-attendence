package com.smartattendance.config;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DBConnection {
    private static final String URL = "jdbc:mysql://localhost:3306/smart_attendance?useSSL=false&serverTimezone=UTC";
    private static final String USERNAME = "root";
    private static final String PWD = "root";

    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException ex) {
            throw new RuntimeException("MySQL Driver not found", ex);
        }
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USERNAME, PWD);
    }

    public static void closeQuietly(AutoCloseable... items) {
        for (AutoCloseable item : items) {
            if (item != null) {
                try { item.close(); } catch (Exception ignored) {}
            }
        }
    }
}
