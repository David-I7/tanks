package com.tanks.server.websocket.entities.userSession;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.redis.core.RedisHash;

import java.util.UUID;

@Builder
@AllArgsConstructor
@NoArgsConstructor
@Data
@RedisHash("userSession")
public class UserSession {

    @Id
    private long id;

    private UserSessionState state;

    private UUID gameSessionId;

    private UUID lobbyId;

}
