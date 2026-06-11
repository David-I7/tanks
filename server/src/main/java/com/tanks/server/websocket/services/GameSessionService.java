package com.tanks.server.websocket.services;

import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.game.GameLobbyPayload;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class GameSessionService {

    private final GameSessionRepository gameRepository;

    public GameSession create(Lobby lobby){
        GameSession gameSession = GameSession.builder()
                .id(IdFactory.randomUUID())
                .playerAId(lobby.getHostId())
                .playerBId(lobby.getOpponentId())
                .createdAt(OffsetDateTime.now())
                .build();

        return gameRepository.save(gameSession);
    };

}
