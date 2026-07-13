package com.tanks.server.websocket.entities.userSession;

import lombok.*;
import org.springframework.data.annotation.Id;

import java.util.*;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
public class UserSession {

    @Id
    private Long id;

    private String username;

    private UserSessionState state;

    private UUID gameSessionId;

    private UUID lobbyId;

    private String socketSessionId;

    private Map<String, String> topicSubscriptions = null;

    public UserSession(UserSession userSession) {
        this.id = userSession.id;
        this.username = userSession.username;
        this.state = userSession.state;
        this.gameSessionId = userSession.gameSessionId;
        this.lobbyId = userSession.lobbyId;
        this.socketSessionId = userSession.socketSessionId;
        this.topicSubscriptions = userSession.topicSubscriptions == null
                ? null
                : new HashMap<>(userSession.topicSubscriptions);
    }
}
