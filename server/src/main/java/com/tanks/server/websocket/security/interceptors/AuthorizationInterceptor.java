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
            String sessionId = accessor.getSessionId();

            try {
                UserSession userSession = userSessionService.findById(principal.getUserDto().id());

                if(!sessionId.equals(userSession.getSocketSessionId())){
                    throw new ProblemDetailException(HttpStatus.BAD_REQUEST,"User is already connected", null);
                }

                principal.setUserSession(userSession);
            }catch (ProblemDetailException ex){
                // user is connecting for the first time
                if(ex.getStatus().equals(HttpStatus.NOT_FOUND)){
                    UserSession userSession = UserSession.builder()
                            .id(principal.getUserDto().id())
                            .username(principal.getUserDto().username())
                            .state(UserSessionState.IDLE)
                            .socketSessionId(sessionId)
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
