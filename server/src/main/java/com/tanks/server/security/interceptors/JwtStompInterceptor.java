package com.tanks.server.security.interceptors;

import com.tanks.server.security.services.JwtService;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
@Slf4j
public class JwtStompInterceptor implements ChannelInterceptor {

    private final String TOKEN_PREFIX = "Bearer ";

    private final JwtService jwtService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith(TOKEN_PREFIX)) {
                throw new MessagingException("AUTH_ERROR:MISSING_TOKEN");
            }

            String token = authHeader.substring(TOKEN_PREFIX.length());

            try{
                Authentication authentication = jwtService.validate(token);
                accessor.setUser(authentication);
            } catch (SignatureException | MalformedJwtException e) {
                log.error("Invalid JWT token: {}", e.getMessage());
                throw new MessagingException("AUTH_ERROR:INVALID_TOKEN");
            } catch (ExpiredJwtException e){
                log.error("JWT has expired: {}", e.getMessage());
                throw new MessagingException("AUTH_ERROR:EXPIRED_TOKEN");
            }

        }

        return message;
    }
}