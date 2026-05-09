package com.tanks.server.security.oauth;

import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.entities.User;
import com.tanks.server.factories.ProblemDetailWriter;
import com.tanks.server.model.JwtSession;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.services.AuthService;
import com.tanks.server.services.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;

@Component
@AllArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private AuthService authService;

    private JwtService jwtService;

    private UserService userService;

    private ObjectMapper objectMapper;

    private ProblemDetailWriter problemDetailWriter;

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

            JwtSession session = authService.createSession(user);

            response.addHeader("Set-Cookie", session.cookie().toString());
            response.setStatus(HttpStatus.OK.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);

            objectMapper.writeValue(response.getWriter(),new RefreshTokenResponse(session.accessToken(),session.userDto()));

        }catch (ResponseStatusException ex){
            // User does not exist

            response.setStatus(HttpStatus.NOT_IMPLEMENTED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getWriter(),"Oauth registration not implemented yet");
            return;
        }


    }
}
