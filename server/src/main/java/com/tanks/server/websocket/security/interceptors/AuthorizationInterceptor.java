package com.tanks.server.websocket.security.interceptors;

import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.security.entites.WebSocketAuthentication;
import com.tanks.server.websocket.security.entites.WebSocketPrincipal;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.AllArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

@Component
@AllArgsConstructor
public class AuthorizationInterceptor implements ChannelInterceptor {

    private final UserSessionService userSessionService;

    @Override
    public @Nullable Message<?> preSend(Message<?> message, MessageChannel channel) {

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {

            WebSocketPrincipal principal = (WebSocketPrincipal) ((WebSocketAuthentication) accessor.getUser()).getPrincipal();

            try {
                UserSession userSession = userSessionService.findById(principal.getUserDto().id());

                if(userSession.isConnected()){
                    throw new ProblemDetailException(HttpStatus.BAD_REQUEST,"User is already connected", null);
                }
            }catch (ProblemDetailException ex){
                //
                if(ex.getStatus().equals(HttpStatus.NOT_FOUND)){
                    UserSession userSession = UserSession.builder()
                            .id(principal.getUserDto().id())
                            .state(UserSessionState.IDLE)
                            .connected(true)
                            .build();

                    principal.setUserSession(userSession);
                    userSessionService.save(userSession);
                }else {
                    throw ex;
                }
            }
        }

        return message;
    }
}
