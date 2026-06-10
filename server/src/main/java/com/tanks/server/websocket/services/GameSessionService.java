package com.tanks.server.websocket.services;

import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;

@Service
@AllArgsConstructor
public class GameSessionService {

    private GameSessionRepository gameRepository;

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
