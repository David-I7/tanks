package com.tanks.server.websocket.config;

import com.tanks.server.websocket.exceptions.StompErrorHandler;
import com.tanks.server.websocket.security.interceptors.AuthorizationInterceptor;
import com.tanks.server.websocket.security.interceptors.LobbyHandshakeHandler;
import com.tanks.server.websocket.security.interceptors.LobbyHandshakeInterceptor;
import com.tanks.server.websocket.security.interceptors.StompReceiptInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final LobbyHandshakeInterceptor lobbyHandshakeInterceptor;
    private final LobbyHandshakeHandler lobbyHandshakeHandler;
    private final AuthorizationInterceptor authorizationInterceptor;
    private final StompReceiptInterceptor stompReceiptInterceptor;
    private final StompErrorHandler stompErrorHandler;

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authorizationInterceptor, stompReceiptInterceptor);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic", "/queue")
                .setHeartbeatValue(new long[] {10000, 10000}) // 10s
                .setTaskScheduler(webSocketHeartbeatTaskScheduler());
        config.setUserDestinationPrefix("/user");
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .addInterceptors(lobbyHandshakeInterceptor)
                .setHandshakeHandler(lobbyHandshakeHandler)
                .setAllowedOriginPatterns("*");
        registry.setErrorHandler(stompErrorHandler);
    }

    @Bean
    public TaskScheduler webSocketHeartbeatTaskScheduler() {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("wss-heartbeat-thread-");
        scheduler.initialize();
        return scheduler;
    }
}
