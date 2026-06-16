package com.tanks.server.security;

import com.tanks.server.dto.UserDto;
import com.tanks.server.security.model.JwtAuthentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.test.context.support.WithSecurityContextFactory;

public class WithMockJwtUserSecurityContextFactory implements WithSecurityContextFactory<WithMockJwtUser> {
    @Override
    public SecurityContext createSecurityContext(WithMockJwtUser annotation) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        UserDto userDto = new UserDto(annotation.id(), annotation.username(), annotation.email());
        context.setAuthentication(new JwtAuthentication(userDto));
        return context;
    }
}
