package com.smartattendance;

import org.apache.catalina.startup.Tomcat;
import java.io.File;

public class EmbeddedTomcat {
    public static void main(String[] args) throws Exception {
        Tomcat tomcat = new Tomcat();
        tomcat.setPort(8080);
        tomcat.setBaseDir(new File(System.getProperty("java.io.tmpdir")).getAbsolutePath());
        
        String warPath = new File("target/smart-attendance.war").getAbsolutePath();
        tomcat.addWebapp("/api", warPath);
        
        System.out.println("Starting Tomcat on port 8080...");
        System.out.println("WAR file: " + warPath);
        
        tomcat.start();
        tomcat.getServer().await();
    }
}
