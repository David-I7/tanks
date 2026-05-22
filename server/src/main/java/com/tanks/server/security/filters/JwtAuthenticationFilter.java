package com.tanks.server.security.filters;

import com.tanks.server.services.AuthService;
import com.tanks.server.utils.ProblemDetailWriter;
import com.tanks.server.security.model.JwtAuthentication;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private String TOKEN_PREFIX = "Bearer ";

    private AuthService authService;

    private ProblemDetailWriter problemDetailWriter;

    public JwtAuthenticationFilter(AuthService authService, ProblemDetailWriter problemDetailWriter){
        this.authService = authService;
        this.problemDetailWriter = problemDetailWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        // User is logging in, registering, or logging out.
        if(     request.getServletPath().startsWith("/api/v1/auth/register") ||
                request.getServletPath().startsWith("/api/v1/auth/login")    ||
                request.getServletPath().startsWith("/api/v1/auth/logout")    ||
                request.getServletPath().startsWith("/api/v1/auth/oauth2/authorization") ||
                request.getServletPath().startsWith("/ws") ||
                request.getServletPath().startsWith("/api/v1/auth/refresh")){

            filterChain.doFilter(request,response);
            return;
        }
        // User has been logged in by some other filter
        else if(SecurityContextHolder.getContext().getAuthentication() != null){
            filterChain.doFilter(request,response);
            return;
        }

        // Extract user from access token
        String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);

        if(authHeader == null || !authHeader.startsWith(TOKEN_PREFIX)){
            problemDetailWriter.write(request,response, HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header");
            return;
        }

        String token = authHeader.substring(TOKEN_PREFIX.length());

        try{
            SecurityContextHolder.getContext().setAuthentication(new JwtAuthentication(authService.parseUser(token)));
        }catch (ResponseStatusException e){
            problemDetailWriter.write(request,response,HttpStatus.UNAUTHORIZED, e.getMessage());
            return;
        }

        filterChain.doFilter(request,response);
    }

}
