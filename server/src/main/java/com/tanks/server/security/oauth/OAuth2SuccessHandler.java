package com.tanks.server.security.oauth;

import com.tanks.server.entities.IdentityProvider;
import com.tanks.server.entities.User;
import com.tanks.server.entities.UserIdentity;
import com.tanks.server.entities.UserIdentityID;
import com.tanks.server.factories.ErrorResponseWriter;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.services.UserIdentityService;
import com.tanks.server.services.UserService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import java.io.IOException;
import java.util.Optional;

@Configuration
@AllArgsConstructor
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private JwtService jwtService;

    private UserService userService;

    private ErrorResponseWriter errorResponseWriter;

    private UserIdentityService userIdentityService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {

        OAuth2AuthenticationToken oauthToken =
                (OAuth2AuthenticationToken) authentication;

        OAuth2User oauthUser = oauthToken.getPrincipal();

        String provider = oauthToken.getAuthorizedClientRegistrationId();
        String providerUserId = oauthUser.getAttribute("sub");
        String email = oauthUser.getAttribute("email");

        Optional<UserIdentity> userIdentity = userIdentityService.findById(new UserIdentityID(IdentityProvider.fromString(provider),providerUserId));

        if(userIdentity.isPresent()){

        }else{
            User user = User.builder()
                    .email(email)
                    .build();
            userService.register(user);


        }
    }
}
