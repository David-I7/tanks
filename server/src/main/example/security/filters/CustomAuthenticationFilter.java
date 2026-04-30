package com.tanks.server.example.security.filters;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@AllArgsConstructor
public class CustomAuthenticationFilter extends OncePerRequestFilter {

    private CustomAuthenticationManager customAuthenticationManager;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String apiKey = request.getHeader("X-API-KEY");

        if(apiKey == null){
            filterChain.doFilter(request, response);
            return;
        }

        CustomAuthentication customAuthentication = new CustomAuthentication(false,apiKey);

        try {
            var a = customAuthenticationManager.authenticate(customAuthentication);

            if (a.isAuthenticated()) {
                SecurityContextHolder.getContext().setAuthentication(a);
            }else throw new BadCredentialsException("Bad request!");

        } catch (AuthenticationException e) {
            response.setStatus(401);
            response.getWriter().print(e.getMessage());
        }
    }
}
