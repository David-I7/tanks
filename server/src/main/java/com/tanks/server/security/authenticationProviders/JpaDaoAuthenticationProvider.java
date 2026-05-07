package com.tanks.server.security.authenticationProviders;

import com.tanks.server.security.entities.JpaUserDetails;
import com.tanks.server.security.entities.JwtAuthentication;
import com.tanks.server.security.entities.JwtAuthenticationToken;
import com.tanks.server.security.services.JpaUserDetailsService;
import lombok.AllArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;

@AllArgsConstructor
public class JpaDaoAuthenticationProvider implements AuthenticationProvider {

    private JpaUserDetailsService userDetailsService;

    private PasswordEncoder passwordEncoder;

    @Override
    public @Nullable Authentication authenticate(Authentication authentication) throws AuthenticationException {

        JwtAuthenticationToken token = (JwtAuthenticationToken)  authentication;

        JpaUserDetails userDetails;

        if(token.getEmail() != null){
            userDetails = (JpaUserDetails) userDetailsService.loadUserByEmail(token.getEmail());
        }else{
            userDetails = (JpaUserDetails) userDetailsService.loadUserByUsername(token.getUsername());
        }

        if(token.getPassword())

        return null;
    }

    @Override
    public boolean supports(Class<?> authentication) {
        if(JwtAuthenticationToken.class.equals(authentication)) return true;

        return false;
    }
}
