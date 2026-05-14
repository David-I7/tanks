package com.tanks.server.security.oauth;

import com.tanks.server.dto.auth.OAuth2LoginResponse;
import com.tanks.server.dto.auth.OAuth2LoginResponseType;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2AuthenticationFailureHandler implements AuthenticationFailureHandler {
    @Override
    public void onAuthenticationFailure(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception) throws IOException, ServletException {
        request.getSession().setAttribute("oauth2LoginResponse",new OAuth2LoginResponse(OAuth2LoginResponseType.OAUTH2_FAILURE,null));
        request.getRequestDispatcher("/api/v1/auth/login/oauth2/response").forward(request,response);
    }
}
