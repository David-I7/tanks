package com.tanks.server.security.filters;

import com.tanks.server.exceptions.InvalidJwtException;
import com.tanks.server.factories.ErrorResponseWriter;
import com.tanks.server.security.entities.JwtAuthentication;
import com.tanks.server.security.mappers.ClaimsToUserDtoMapper;
import com.tanks.server.security.services.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.Optional;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private String TOKEN_PREFIX = "Bearer ";

    private JwtService jwtService;

    private ClaimsToUserDtoMapper mapper = new ClaimsToUserDtoMapper();

    private ErrorResponseWriter errorResponseWriter;

    public JwtAuthenticationFilter(JwtService jwtService, ErrorResponseWriter errorResponseWriter){
        this.jwtService = jwtService;
        this.errorResponseWriter = errorResponseWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        // User is logging in or registering
        System.out.println("\n\n\n\n\n\nHELLLLLLLLLOOOOOO\n\n\n\n\n\n");
        if(     request.getServletPath().startsWith("/api/v1/auth/register") ||
                request.getServletPath().startsWith("/api/v1/auth/login")    ||
                request.getServletPath().startsWith("/api/v1/auth/oauth2/authorization") ||
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
            errorResponseWriter.write(request,response, HttpStatus.UNAUTHORIZED.value(), "Missing or invalid authorization header");
            return;
        }

        String token = authHeader.substring(TOKEN_PREFIX.length());

        try{
            Claims claims = jwtService.parseClaims(token);
            SecurityContextHolder.getContext().setAuthentication(new JwtAuthentication(mapper.apply(claims)));

        }catch (InvalidJwtException e){
            errorResponseWriter.write(request,response,HttpStatus.UNAUTHORIZED.value(), e.getMessage());
            return;
        }

        filterChain.doFilter(request,response);
    }

}
