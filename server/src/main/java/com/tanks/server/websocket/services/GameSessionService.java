package com.tanks.server.websocket.services;

import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.game.GameIdPayload;
import com.tanks.server.websocket.dto.game.GameStartPayload;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.gameplay.OnlineInitialStateFactory;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.gameplay.OnlineGameplayRules;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.redis.core.RedisTemplate;
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
    private final RedisTemplate<String, Object> redisTemplate;
    private final RedisClaimService redisClaimService;
    private final OnlineGameplayRules gameplayRules;
    private final OnlineInitialStateFactory initialStateFactory;

    public GameSession create(Lobby lobby) {
        if (!redisClaimService.claimGameCreation(lobby.getId(), lobby.getHostId())) {
            throw new ProblemDetailException(HttpStatus.CONFLICT, "Game creation is already in progress.", URI.create("/game/create"));
        }

        GameSession savedGameSession = null;
        UserSession host = null;
        UserSession opponent = null;
        UserSession originalHost = null;
        UserSession originalOpponent = null;

        try {
            Lobby freshLobby = lobbyRepository.findById(lobby.getId())
                    .orElseThrow(() -> new ProblemDetailException(HttpStatus.NOT_FOUND, "The lobby with the provided id does not exist.", URI.create("about:blank")));

            if (freshLobby.getStatus() != LobbyStatus.READY || freshLobby.getOpponentId() == null) {
                throw new ProblemDetailException(HttpStatus.CONFLICT, "Lobby is no longer ready to create a game.", URI.create("/game/create"));
            }

            host = userSessionService.findById(freshLobby.getHostId());
            opponent = userSessionService.findById(freshLobby.getOpponentId());
            originalHost = new UserSession(host);
            originalOpponent = new UserSession(opponent);

            UUID gameSessionId = IdFactory.randomUUID();
            GameSession gameSession = GameSession.builder()
                    .id(gameSessionId)
                    .playerA(host.getUsername())
                    .playerB(opponent.getUsername())
                    .createdAt(OffsetDateTime.now())
                    .state(GameSessionState.CREATED)
                    .gameplayDefinitionVersion(gameplayRules.currentVersion())
                    .build();

            savedGameSession = gameRepository.save(gameSession);

            GameEventResponseDto response = new GameEventResponseDto(
                    GameEventType.GAME_CREATED,
                    "@SERVER",
                    new GameIdPayload(savedGameSession.getId(), null)
            );

            userSessionService.transitionToGame(host, savedGameSession.getId());
            userSessionService.transitionToGame(opponent, savedGameSession.getId());

            userSessionService.save(host);
            userSessionService.save(opponent);
            redisClaimService.markUserSessionReloadRequired(host.getId());
            redisClaimService.markUserSessionReloadRequired(opponent.getId());

            lobbyRepository.delete(freshLobby);
            redisClaimService.deleteLobbyJoin(lobby.getId());
            redisClaimService.deleteGameCreation(lobby.getId());
            if (freshLobby.getType() == LobbyType.QUICK_MATCH) {
                quickMatchService.delete(freshLobby);
            }

            eventPublisher.publishEvent(new GameEvent(this, host.getUsername(), "/queue/replies", response));
            eventPublisher.publishEvent(new GameEvent(this, opponent.getUsername(), "/queue/replies", response));

            return savedGameSession;
        } catch (RuntimeException ex) {
            if (host != null) {
                redisClaimService.deleteUserSessionReloadRequired(host.getId());
            }
            if (opponent != null) {
                redisClaimService.deleteUserSessionReloadRequired(opponent.getId());
            }
            if (host != null && originalHost != null) {
                restoreUserSession(host, originalHost);
                saveUserSessionQuietly(host);
            }
            if (opponent != null && originalOpponent != null) {
                restoreUserSession(opponent, originalOpponent);
                saveUserSessionQuietly(opponent);
            }
            if (savedGameSession != null) {
                deleteGameQuietly(savedGameSession);
            }
            redisClaimService.releaseGameCreation(lobby.getId(), lobby.getHostId());
            throw ex;
        }
    }

    public void startGame(GameSession gameSession) {
        if (!redisClaimService.claimGameStart(gameSession.getId())) {
            return;
        }

        try {
            GameSession freshGameSession = findById(gameSession.getId());
            if (!GameSessionState.CREATED.equals(freshGameSession.getState())) {
                return;
            }

            freshGameSession.setStartedAt(OffsetDateTime.now());
            freshGameSession.setPlayerTurn(freshGameSession.getPlayerA());
            freshGameSession.setState(GameSessionState.STARTED);
            gameRepository.save(freshGameSession);

            GameEventResponseDto response =
                    new GameEventResponseDto(
                            GameEventType.GAME_STARTED,
                            "@SERVER",
                            new GameStartPayload(
                                    freshGameSession.getId(),
                                    freshGameSession.getPlayerA(),
                                    freshGameSession.getPlayerB(),
                                    freshGameSession.getStartedAt(),
                                    freshGameSession.getGameplayDefinitionVersion())
                    );

            eventPublisher.publishEvent(new GameEvent(this, freshGameSession.getPlayerA(), "/queue/replies", response));
            eventPublisher.publishEvent(new GameEvent(this, freshGameSession.getPlayerB(), "/queue/replies", response));
            sendInitialStateToPlayer(freshGameSession, freshGameSession.getPlayerA());
            sendInitialStateToPlayer(freshGameSession, freshGameSession.getPlayerB());
        } finally {
            redisClaimService.deleteGameStart(gameSession.getId());
        }
    }

    public void sendInitialStateToPlayer(GameSession gameSession, String username) {
        eventPublisher.publishEvent(new OnlineGameplayEvent(
                this,
                username,
                "/queue/replies",
                initialStateFactory.create(gameSession)));
    }

    public GameSession findById(UUID gameSessionId) {
        return gameRepository.findById(gameSessionId).orElseThrow(() -> new ProblemDetailException(HttpStatus.NOT_FOUND,"Game session not found", URI.create("about:blank")));
    }

    public GameSession getAndIncrementPlayerCount(UUID gameSessionId){
        var res = redisTemplate.opsForHash().increment(member(gameSessionId), "connectedPlayerCount", 1L);

        GameSession gameSession;
        try {
            gameSession = findById(gameSessionId);
        } catch (RuntimeException ex) {
            decremenentPlayerCount(gameSessionId);
            throw ex;
        }

        gameSession.setConnectedPlayerCount(res.intValue());

        return gameSession;
    }

    public void decremenentPlayerCount(UUID gameSessionId){
        redisTemplate.opsForHash().increment(member(gameSessionId), "connectedPlayerCount", -1L);
    }

    private String member(UUID gameSessionId){
        return "gameSession:" + gameSessionId;
    }

    private void deleteGameQuietly(GameSession gameSession) {
        try {
            gameRepository.delete(gameSession);
        } catch (RuntimeException cleanupEx) {
            log.warn("Failed to clean up game session '{}' after failed operation", gameSession.getId(), cleanupEx);
        }
    }

    private void saveUserSessionQuietly(UserSession userSession) {
        try {
            userSessionService.save(userSession);
        } catch (RuntimeException restoreEx) {
            log.warn("Failed to restore user session '{}' after failed game creation", userSession.getId(), restoreEx);
        }
    }

    private void restoreUserSession(UserSession target, UserSession source) {
        target.setState(source.getState());
        target.setGameSessionId(source.getGameSessionId());
        target.setLobbyId(source.getLobbyId());
        target.setSocketSessionId(source.getSocketSessionId());
        target.setTopicSubscriptions(source.getTopicSubscriptions());
    }
}
