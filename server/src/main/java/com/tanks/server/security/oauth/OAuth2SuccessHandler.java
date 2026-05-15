package com.tanks.server.security.oauth;

import com.tanks.server.dto.auth.OAuth2LoginResponse;
import com.tanks.server.dto.auth.OAuth2LoginResponseType;
import com.tanks.server.entities.User;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.services.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Map;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private JwtService jwtService;

    private UserService userService;

    public OAuth2SuccessHandler(JwtService jwtService,
                                 UserService userService){
        this.jwtService = jwtService;
        this.userService = userService;
    }

    private long OAUTH2_SUCCESS_TOKEN_EXPIRATION_DURATION_MS = 1000l * 60 * 2; // 2 minutes

    private long OAUTH2_PARTIAL_TOKEN_EXPIRATION_DURATION_MS = 1000l * 60 * 10; // 10 minutes

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {

        OAuth2AuthenticationToken oauthToken =
                (OAuth2AuthenticationToken) authentication;

        OAuth2User oauthUser = oauthToken.getPrincipal();

        String provider = oauthToken.getAuthorizedClientRegistrationId();
        String providerUserId = oauthUser.getAttribute("sub");
        String email = oauthUser.getAttribute("email");

        try{
            User user = userService.findByEmail(email);
            String token = jwtService.generateToken(user.getEmail(), Map.of(),OAUTH2_SUCCESS_TOKEN_EXPIRATION_DURATION_MS);
            request.getSession().setAttribute("oauth2LoginResponse",new OAuth2LoginResponse(OAuth2LoginResponseType.OAUTH2_SUCCESS,token));
            request.getRequestDispatcher("/api/v1/auth/login/oauth2/response").forward(request,response);
        }catch (ResponseStatusException ex){
            // User does not exist

            String token = jwtService.generateToken(email, Map.of(),OAUTH2_PARTIAL_TOKEN_EXPIRATION_DURATION_MS);
            request.getSession().setAttribute("oauth2LoginResponse",new OAuth2LoginResponse(OAuth2LoginResponseType.OAUTH2_PARTIAL,token));
            request.getRequestDispatcher("/api/v1/auth/login/oauth2/response").forward(request,response);
        }
    }
}
