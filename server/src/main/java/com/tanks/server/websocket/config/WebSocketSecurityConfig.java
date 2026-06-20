package com.tanks.server.websocket.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageType;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.authorization.AuthorizationManager;
import org.springframework.security.config.annotation.web.socket.EnableWebSocketSecurity;
import org.springframework.security.messaging.access.intercept.MessageMatcherDelegatingAuthorizationManager;

@Configuration
@EnableWebSocketSecurity
@RequiredArgsConstructor
public class WebSocketSecurityConfig {


    @Bean
    AuthorizationManager<Message<?>> authorizationManager(MessageMatcherDelegatingAuthorizationManager.Builder messages) {
        messages
            .simpTypeMatchers(
                    SimpMessageType.CONNECT,
                    SimpMessageType.DISCONNECT,
                    SimpMessageType.OTHER,
                    SimpMessageType.HEARTBEAT,
                    SimpMessageType.SUBSCRIBE
            ).permitAll()
            .simpDestMatchers("/app/**").authenticated()
            .simpSubscribeDestMatchers(
                    "/topic/lobby/*",
                    "/topic/game/*",
                    "/user/queue/replies",
                    "/user/queue/errors").authenticated()
            .anyMessage().denyAll();
        return messages.build();
    }

    @Bean
    public ChannelInterceptor csrfChannelInterceptor() {
        return new ChannelInterceptor() {};
    }

}
