package com.tanks.server.websocket.services;

import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.game.GameIdPayload;
import com.tanks.server.websocket.dto.game.GameStartPayload;
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
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameSessionService {

    private final GameSessionRepository gameRepository;
    private final UserSessionService userSessionService;
    private final LobbyRepository lobbyRepository;
    private final QuickMatchService quickMatchService;
    private final ApplicationEventPublisher eventPublisher;
    private final RedisTemplate<String,Object> redisTemplate;
    private final ObjectMapper objectMapper;

    public GameSession create(Lobby lobby) {
        UserSession host = userSessionService.findById(lobby.getHostId());
        UserSession opponent = userSessionService.findById(lobby.getOpponentId());

        UUID gameSessionId = IdFactory.randomUUID();
        GameSession gameSession = GameSession.builder()
                .id(gameSessionId)
                .playerA(host.getUsername())
                .playerB(opponent.getUsername())
                .createdAt(OffsetDateTime.now())
                .state(GameSessionState.CREATED)
                .build();

        GameSession savedGameSession = gameRepository.save(gameSession);

        GameEventResponseDto response = new GameEventResponseDto(
                GameEventType.GAME_CREATED,
                "@SERVER",
                new GameIdPayload(savedGameSession.getId(), null)
        );

        userSessionService.transitionToGame(host, savedGameSession.getId());
        userSessionService.transitionToGame(opponent, savedGameSession.getId());

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

    public void startGame(GameSession gameSession){
       gameSession.setStartedAt(OffsetDateTime.now());
       gameSession.setPlayerTurn(gameSession.getPlayerA());
       gameSession.setState(GameSessionState.STARTED);
       gameRepository.save(gameSession);

        GameEventResponseDto response =
                new GameEventResponseDto(
                        GameEventType.GAME_STARTED,
                        "@SERVER",
                        new GameStartPayload(gameSession.getId(), gameSession.getPlayerA(), gameSession.getPlayerB(), gameSession.getStartedAt())
           );

        eventPublisher.publishEvent(new GameEvent(this, gameSession.getPlayerA(), "/queue/replies", response));
        eventPublisher.publishEvent(new GameEvent(this, gameSession.getPlayerB(), "/queue/replies", response));
    }

    public GameSession findById(UUID gameSessionId) {
        return gameRepository.findById(gameSessionId).orElseThrow(() -> new ProblemDetailException(HttpStatus.INTERNAL_SERVER_ERROR,"Game session not found", URI.create("about:blank")));
    }

    public GameSession getAndIncrementPlayerCount(UUID gameSessionId){
        String key = "gameSession:" + gameSessionId;
        var res = redisTemplate.opsForHash().increment(key, "connectedPlayerCount", 1L);

        var gameSession = findById(gameSessionId);

        gameSession.setConnectedPlayerCount(res.intValue());

        return gameSession;
    }

    public void decremenentPlayerCount(UUID gameSessionId){
        redisTemplate.opsForHash().increment("gameSession:" + gameSessionId, "connectedPlayerCount", -1L);
    }
}
