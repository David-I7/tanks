package com.tanks.server.websocket.services;

import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.game.GameEventPayload;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class GameSessionService {

    private final GameSessionRepository gameRepository;
    private final UserSessionService userSessionService;
    private final LobbyRepository lobbyRepository;
    private final QuickMatchService quickMatchService;
    private final ApplicationEventPublisher eventPublisher;
    private final ClaimService claimService;

    public GameSession create(Lobby lobby) {
        UserSession host = userSessionService.findById(lobby.getHost().getId());
        UserSession opponent = userSessionService.findById(lobby.getOpponent().getId());
        UserSession originalHost = new UserSession(host);
        UserSession originalOpponent = new UserSession(opponent);
        GameSession savedGameSession = null;

        try {
            UUID gameSessionId = IdFactory.randomUUID();
            GameSession gameSession = GameSession.builder()
                    .id(gameSessionId)
                    .hostId(host.getId())
                    .playerA(host.getUsername())
                    .playerB(opponent.getUsername())
                    .createdAt(OffsetDateTime.now())
                    .state(GameSessionState.CREATED)
                    .build();

            savedGameSession = gameRepository.save(gameSession);

            GameEventResponseDto response = new GameEventResponseDto(
                    GameEventType.GAME_CREATED,
                    new GameEventPayload(savedGameSession.getId(), savedGameSession.getHostId(), host.getUsername())
            );

            userSessionService.transitionToGame(host, savedGameSession.getId());
            userSessionService.transitionToGame(opponent, savedGameSession.getId());

            userSessionService.save(host);
            userSessionService.save(opponent);
            claimService.markUserSessionReloadRequired(host.getId());
            claimService.markUserSessionReloadRequired(opponent.getId());

            lobbyRepository.delete(lobby);
            if (lobby.getType() == LobbyType.QUICK_MATCH) {
                quickMatchService.delete(lobby);
            }

            eventPublisher.publishEvent(new GameEvent(this, host.getUsername(), "/queue/replies", response));
            eventPublisher.publishEvent(new GameEvent(this, opponent.getUsername(), "/queue/replies", response));

            log.info("Game created: {} vs {}", host.getUsername(), opponent.getUsername());
            return savedGameSession;
        } catch (RuntimeException ex) {

            claimService.deleteUserSessionReloadRequired(host.getId());
            claimService.deleteUserSessionReloadRequired(opponent.getId());
            userSessionService.save(originalHost);
            userSessionService.save(originalOpponent);

            if (savedGameSession != null) {
                deleteGameQuietly(savedGameSession);
            }

            log.error("Failed to create game", ex);
            throw ex;
        }
    }

    public void startGame(GameSession gameSession) {
        if (!GameSessionState.CREATED.equals(gameSession.getState())) {
            return;
        }

        gameSession.setStartedAt(OffsetDateTime.now());
        gameSession.setState(GameSessionState.STARTED);
        gameRepository.save(gameSession);

        GameEventResponseDto response = new GameEventResponseDto(
                GameEventType.GAME_CONNECT,
                new GameEventPayload(gameSession.getId(), gameSession.getHostId(), gameSession.getPlayerA())
        );

        eventPublisher.publishEvent(new GameEvent(this, null, "/topic/game/" + gameSession.getId(), response));

        log.debug("Game started: {} vs {}", gameSession.getPlayerA(), gameSession.getPlayerB());
    }

    public GameSession findById(UUID gameSessionId) {
        return gameRepository.findById(gameSessionId).orElseThrow(() -> new ProblemDetailException(HttpStatus.NOT_FOUND, "Game session not found", URI.create("about:blank")));
    }

    public GameSession getAndIncrementPlayerCount(UUID gameSessionId) {
        GameSession gameSession = findById(gameSessionId);
        if (gameSession.getConnectedPlayerCount() >= 2)
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Game session already has 2 players", URI.create("about:blank"));
        gameSession.setConnectedPlayerCount(gameSession.getConnectedPlayerCount() + 1);
        return gameRepository.save(gameSession);
    }

    public void decremenentPlayerCount(UUID gameSessionId) {
        GameSession gameSession = findById(gameSessionId);
        if (gameSession.getConnectedPlayerCount() <= 0)
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Game session is already empty", URI.create("about:blank"));
        gameSession.setConnectedPlayerCount(gameSession.getConnectedPlayerCount() - 1);
        gameRepository.save(gameSession);
    }

    private void deleteGameQuietly(GameSession gameSession) {
        try {
            gameRepository.delete(gameSession);
        } catch (RuntimeException cleanupEx) {
            log.warn("Failed to clean up game session '{}' after failed operation", gameSession.getId(), cleanupEx);
        }
    }
}
