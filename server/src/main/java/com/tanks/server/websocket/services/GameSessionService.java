package com.tanks.server.websocket.services;

import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.game.GameLobbyPayload;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameSessionService {

    private final GameSessionRepository gameRepository;
    private final UserSessionService userSessionService;
    private final LobbyRepository lobbyRepository;
    private final QuickMatchService quickMatchService;
    private final ApplicationEventPublisher eventPublisher;

    public GameSession create(Lobby lobby) {
        UUID gameSessionId = IdFactory.randomUUID();
        GameSession gameSession = GameSession.builder()
                .id(gameSessionId)
                .playerAId(lobby.getHostId())
                .playerBId(lobby.getOpponentId())
                .createdAt(OffsetDateTime.now())
                .build();

        GameSession savedGameSession = gameRepository.save(gameSession);

        UserSession host = userSessionService.findById(lobby.getHostId());
        UserSession opponent = userSessionService.findById(lobby.getOpponentId());

        GameEventResponseDto response = new GameEventResponseDto(
                GameEventType.GAME_CREATED,
                "@SERVER",
                new GameLobbyPayload(savedGameSession.getId(), null)
        );

        userSessionService.transitionToGame(host, savedGameSession.getId());
        userSessionService.transitionToGame(opponent, savedGameSession.getId());

        // Delete lobby logic moved here to break circular dependency with LobbyService
        lobbyRepository.delete(lobby);
        if (lobby.getType() == LobbyType.QUICK_MATCH) {
            quickMatchService.delete(lobby);
        }

        userSessionService.save(host);
        userSessionService.save(opponent);

        eventPublisher.publishEvent(new GameEvent(this, host.getUsername(), "/queue/replies", response));
        eventPublisher.publishEvent(new GameEvent(this, opponent.getUsername(), "/queue/replies", response));

        return savedGameSession;
    }

}
