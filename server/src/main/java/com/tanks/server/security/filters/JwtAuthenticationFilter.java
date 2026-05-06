package com.tanks.server.security.filters;

import com.tanks.server.factories.ErrorResponseWriter;
import com.tanks.server.security.entities.JwtAuthenticationToken;
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
        if(     request.getServletPath().startsWith("/auth/register") ||
                request.getServletPath().startsWith("/auth/login")){

            filterChain.doFilter(request,response);
            return;
        }
        // User is trying to refresh their access token
        else if(request.getServletPath().startsWith("/auth/refresh")){
            Optional<Cookie> refreshCookie =  Arrays.stream(request.getCookies())
                                                    .filter(cookie -> cookie.getName().equals("refreshToken"))
                                                    .findFirst();

            // Let the refresh endpoint handle the token refresh if the cookie is present
            if(refreshCookie.isPresent()){
                filterChain.doFilter(request,response);
                return;
            }else{
                errorResponseWriter.write(request,response,HttpStatus.UNAUTHORIZED.value(),"No refreshToken cookie is present");
                return;
            }
        }
        // User has been logged in buy some other filter
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
            Claims claims = jwtService.getClaims(token);
            SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(mapper.apply(claims)));

        }catch (MalformedJwtException ex){
            errorResponseWriter.write(request,response, HttpStatus.UNAUTHORIZED.value(), "Malformed access token");
            return;
        }catch (ExpiredJwtException ex){
            errorResponseWriter.write(request,response, HttpStatus.UNAUTHORIZED.value(), "Expired access token");
            return;
        }catch (JwtException ex){
            errorResponseWriter.write(request,response, HttpStatus.UNAUTHORIZED.value(), "Could not validate the access token");
            return;
        }

        filterChain.doFilter(request,response);
    }

}
