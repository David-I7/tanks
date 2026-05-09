package com.tanks.server.security.filters;

import com.tanks.server.exceptions.InvalidJwtException;
import com.tanks.server.factories.ProblemDetailWriter;
import com.tanks.server.security.entities.JwtAuthentication;
import com.tanks.server.security.mappers.ClaimsToUserDtoMapper;
import com.tanks.server.security.services.JwtService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private String TOKEN_PREFIX = "Bearer ";

    private JwtService jwtService;

    private ClaimsToUserDtoMapper mapper = new ClaimsToUserDtoMapper();

    private ProblemDetailWriter problemDetailWriter;

    public JwtAuthenticationFilter(JwtService jwtService, ProblemDetailWriter problemDetailWriter){
        this.jwtService = jwtService;
        this.problemDetailWriter = problemDetailWriter;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        // User is logging in or registering
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
            problemDetailWriter.write(request,response, HttpStatus.UNAUTHORIZED, "Missing or invalid authorization header");
            return;
        }

        String token = authHeader.substring(TOKEN_PREFIX.length());

        try{
            Claims claims = jwtService.parseClaims(token);
            SecurityContextHolder.getContext().setAuthentication(new JwtAuthentication(mapper.apply(claims)));

        }catch (InvalidJwtException e){
            problemDetailWriter.write(request,response,HttpStatus.UNAUTHORIZED, e.getMessage());
            return;
        }

        filterChain.doFilter(request,response);
    }

}
