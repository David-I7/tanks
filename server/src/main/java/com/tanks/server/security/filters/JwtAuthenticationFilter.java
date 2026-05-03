package com.tanks.server.security.filters;

import com.tanks.server.dto.ErrorResponse;
import com.tanks.server.security.services.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.MalformedJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private String TOKEN_PREFIX = "Bearer ";

    private ObjectMapper objectMapper;

    private JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService,ObjectMapper objectMapper){
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        if(request.getServletPath().startsWith("/auth")){
            filterChain.doFilter(request,response);
            return;
        }

        String authorization = request.getHeader(HttpHeaders.AUTHORIZATION);

        if(authorization == null || !authorization.startsWith(TOKEN_PREFIX)){
            writeErrorResponse(request,response, HttpStatus.UNAUTHORIZED.value(), "Missing or invalid Authorization header");
            return;
        }

        String token = authorization.substring(TOKEN_PREFIX.length());

        try{
            Claims claims = jwtService.getClaims(token);



        }catch (MalformedJwtException ex){
            writeErrorResponse(request,response, HttpStatus.UNAUTHORIZED.value(), "Malformed access token");
        }catch (ExpiredJwtException ex){
            writeErrorResponse(request,response, HttpStatus.UNAUTHORIZED.value(), "Expired access token");
        }catch (JwtException ex){
            writeErrorResponse(request,response, HttpStatus.UNAUTHORIZED.value(), "Could not validate the access token");
        }
    }

    private void writeErrorResponse(HttpServletRequest request,
                                    HttpServletResponse response,
                                    int status,
                                    String message) throws IOException {

        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now().toString(),
                status,
                message,
                request.getRequestURI()
        );

        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        objectMapper.writeValue(response.getWriter(), errorResponse);
    }
}
