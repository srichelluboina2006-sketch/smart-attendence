package com.smartattendance.middleware;

import com.smartattendance.util.JwtUtil;
import com.smartattendance.util.JsonUtil;
import io.jsonwebtoken.Claims;

import javax.servlet.*;
import javax.servlet.annotation.WebFilter;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebFilter(urlPatterns = {"/admin/*", "/faculty/*", "/deo/*"})
public class AuthFilter implements Filter {

    @Override
    public void init(FilterConfig filterConfig) {}

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {

        HttpServletRequest httpReq = (HttpServletRequest) request;
        HttpServletResponse httpResp = (HttpServletResponse) response;

        // Allow preflight CORS requests
        if ("OPTIONS".equalsIgnoreCase(httpReq.getMethod())) {
            setCorsHeaders(httpResp);
            httpResp.setStatus(200);
            return;
        }

        setCorsHeaders(httpResp);

        String authHeader = httpReq.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            JsonUtil.sendError(httpResp, 401, "Missing or invalid authorization token");
            return;
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = JwtUtil.validateToken(token);
            String role = claims.get("role", String.class);
            int userId = claims.get("userId", Integer.class);
            String username = claims.getSubject();

            // Role-based access control
            String path = httpReq.getServletPath();
            if (path.startsWith("/admin") && !"admin".equals(role)) {
                JsonUtil.sendError(httpResp, 403, "Access denied: Admin only");
                return;
            }
            if (path.startsWith("/faculty") && !"faculty".equals(role) && !"admin".equals(role)) {
                JsonUtil.sendError(httpResp, 403, "Access denied: Faculty only");
                return;
            }
            if (path.startsWith("/deo") && !"deo".equals(role) && !"admin".equals(role)) {
                JsonUtil.sendError(httpResp, 403, "Access denied: DEO only");
                return;
            }

            // Set user info as request attributes for downstream servlets
            httpReq.setAttribute("userId", userId);
            httpReq.setAttribute("username", username);
            httpReq.setAttribute("role", role);

            chain.doFilter(request, response);
        } catch (Exception e) {
            JsonUtil.sendError(httpResp, 401, "Invalid or expired token");
        }
    }

    private void setCorsHeaders(HttpServletResponse resp) {
        resp.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
        resp.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        resp.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        resp.setHeader("Access-Control-Allow-Credentials", "true");
    }

    @Override
    public void destroy() {}
}
