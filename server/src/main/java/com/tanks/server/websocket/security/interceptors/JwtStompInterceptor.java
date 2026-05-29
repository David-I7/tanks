package com.tanks.server.websocket.security.interceptors;

import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.security.model.JwtAuthentication;
import com.tanks.server.services.AuthService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;

@Component
@Slf4j
public class JwtStompInterceptor implements ChannelInterceptor {

    private final String TOKEN_PREFIX = "Bearer ";

    private final AuthService authService;


    public JwtStompInterceptor(AuthService authService){
        this.authService = authService;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith(TOKEN_PREFIX)) {
                throw new ProblemDetailException(HttpStatus.UNAUTHORIZED,"Missing or invalid authorization header.", URI.create("/ws"));
            }

            String token = authHeader.substring(TOKEN_PREFIX.length());

            try{
                // set user in the web socket session
                accessor.setUser(new JwtAuthentication(authService.parseUser(token)));
            }catch ( ResponseStatusException e){
                throw new ProblemDetailException(HttpStatus.UNAUTHORIZED,e.getReason(), URI.create("/ws"));
            }

        }

        return message;
    }
}