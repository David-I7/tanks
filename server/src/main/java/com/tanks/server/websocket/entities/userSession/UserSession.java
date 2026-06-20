package com.tanks.server.websocket.entities.userSession;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
@RedisHash("userSession")
public class UserSession {

    @Id
    private Long id;

    private String username;

    private UserSessionState state;

    private UUID gameSessionId;

    private UUID lobbyId;

    private String socketSessionId;

    private Set<String> topicSubscriptions = null;

    public UserSession(UserSession userSession) {
        this.id = userSession.id;
        this.username = userSession.username;
        this.state = userSession.state;
        this.gameSessionId = userSession.gameSessionId;
        this.lobbyId = userSession.lobbyId;
        this.socketSessionId = userSession.socketSessionId;
        this.topicSubscriptions = userSession.topicSubscriptions;
    }

    public void transitionToGame(UUID gameSessionId) {
        this.gameSessionId = gameSessionId;
        this.state = UserSessionState.IN_GAME;
        this.lobbyId = null;
    }

}
