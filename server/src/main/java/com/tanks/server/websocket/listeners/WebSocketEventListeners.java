package com.tanks.server.websocket.listeners;

import com.tanks.server.domain.Lobby;
import com.tanks.server.dto.response.PlayerDto;
import com.tanks.server.websocket.dto.game.GameEventPayload;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameEventType;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.ResyncReason;
import com.tanks.server.websocket.dto.lobby.LobbyEventPayload;
import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;
import com.tanks.server.websocket.dto.lobby.LobbyEventType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.events.LobbyEvent;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.events.WebSocketEvent;
import com.tanks.server.websocket.security.entities.WebSocketAuthentication;
import com.tanks.server.websocket.security.entities.WebSocketPrincipal;
import com.tanks.server.websocket.services.ClaimService;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.LobbyService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;
import org.springframework.web.socket.messaging.SessionSubscribeEvent;
import org.springframework.web.socket.messaging.SessionUnsubscribeEvent;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

@Component
@Slf4j
public class WebSocketEventListeners {

    private static final String TOPIC_LOBBY = "/topic/lobby/";
    private static final String TOPIC_GAME = "/topic/game/";

    private final SimpMessagingTemplate simpMessagingTemplate;
    private final LobbyService lobbyService;
    private final GameSessionService gameSessionService;
    private final ClaimService claimService;

    public WebSocketEventListeners(
            GameSessionService gameSessionService,
            LobbyService lobbyService,
            SimpMessagingTemplate simpMessagingTemplate,
            ClaimService claimService) {
        this.lobbyService = lobbyService;
        this.gameSessionService = gameSessionService;
        this.simpMessagingTemplate = simpMessagingTemplate;
        this.claimService = claimService;
    }

    @EventListener
    public void handleLobbyEvent(LobbyEvent event) {
        send(event);
    }

    @EventListener
    public void handleGameEvent(GameEvent event) {
        send(event);
    }

    @EventListener
    public void handleOnlineGameplayEvent(OnlineGameplayEvent event) {
        send(event);
    }

    private void send(WebSocketEvent<?> event) {
        if (event.getUsername() != null) {
            simpMessagingTemplate.convertAndSendToUser(event.getUsername(), event.getDestination(), event.getPayload());
        } else {
            simpMessagingTemplate.convertAndSend(event.getDestination(), event.getPayload());
        }
    }

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        if (accessor.getUser() == null || !(accessor.getUser() instanceof WebSocketAuthentication authentication)) {
            log.debug("Unauthenticated socket disconnected");
            return;
        }

        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        PlayerDto player = principal.getPlayerDto();
        UUID playerId = player.id();

        try {
            claimLockIfNotHeld(accessor);

            UUID lobbyId = principal.getLobbyId();
            if (lobbyId != null) {
                java.util.Optional<Lobby> lobbyOpt = lobbyService.findActiveOrPendingLobby(lobbyId);
                if (lobbyOpt.isPresent()) {
                    Lobby lobby = lobbyOpt.get();
                    if (lobby.getState() == com.tanks.server.domain.LobbyState.IN_GAME && lobby.getGameSessionId() != null) {
                        handleGameLeave(principal, lobby.getGameSessionId());
                    }
                }
                log.debug("Player {} left lobby {}", player.nickname(), lobbyId);
                handleLobbyLeave(principal);
            } else if (principal.getGameSessionId() != null) {
                log.debug("Player {} left game {}", player.nickname(), principal.getGameSessionId());
                handleGameLeave(principal, principal.getGameSessionId());
            } else {
                log.debug("Player {} disconnected", player.nickname());
            }
        } finally {
            releaseLockIfHeld(playerId, accessor);
        }
    }

    @EventListener
    public void handleSubscribe(SessionSubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        if (accessor.getDestination() == null || accessor.getUser() == null) {
            return;
        }

        WebSocketAuthentication authentication = (WebSocketAuthentication) accessor.getUser();
        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        PlayerDto player = principal.getPlayerDto();

        if (accessor.getDestination().startsWith(TOPIC_LOBBY)) {
            UUID lobbyId = UUID.fromString(accessor.getDestination().substring(TOPIC_LOBBY.length()));
            log.debug("Player {} subscribed to lobby {}", player.nickname(), lobbyId);

            Lobby lobby = lobbyService.findById(lobbyId);
            if (lobby != null && lobby.getHost() != null) {
                simpMessagingTemplate.convertAndSend(
                        accessor.getDestination(),
                        new LobbyEventResponseDto(
                                LobbyEventType.LOBBY_CONNECT,
                                new LobbyEventPayload(
                                        lobbyId,
                                        lobby.getHost().id(),
                                        player.id()
                                )
                        )
                );

                if (lobby.getType() == com.tanks.server.domain.LobbyType.PUBLIC
                        && lobby.isFull()
                        && lobby.getState() == com.tanks.server.domain.LobbyState.READY_TO_START) {
                    log.info("Public lobby {} is full. Auto-creating game session...", lobbyId);
                    gameSessionService.create(lobby);
                }
            }
        } else if (accessor.getDestination().startsWith(TOPIC_GAME)) {
            UUID gameId = UUID.fromString(accessor.getDestination().substring(TOPIC_GAME.length()));
            log.debug("Player {} subscribed to game {}", player.nickname(), gameId);

            principal.setGameSessionId(gameId);
            GameSession gameSession = gameSessionService.addConnectedPlayer(gameId, player.id());

            simpMessagingTemplate.convertAndSend(
                    accessor.getDestination(),
                    new GameEventResponseDto(
                            GameEventType.GAME_CONNECT,
                            new GameEventPayload(
                                    gameId,
                                    gameSession.getHostId(),
                                    player.id()
                            )
                    )
            );

            if (gameSession.getState().equals(GameSessionState.CREATED)) {
                gameSessionService.sendInitialStateToPlayer(gameSession, player.id());
                if (gameSession.getConnectedPlayerCount() == 2) {
                    gameSessionService.startGame(gameSession);
                }
            } else if (gameSession.getState().equals(GameSessionState.STARTED)) {
                gameSessionService.sendResyncStateToPlayer(gameId, player.id(), ResyncReason.RECONNECT);
            }
        }
    }

    @EventListener
    public void handleUnsubscribe(SessionUnsubscribeEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());

        if (accessor.getUser() == null || !(accessor.getUser() instanceof WebSocketAuthentication authentication)) {
            return;
        }

        WebSocketPrincipal principal = (WebSocketPrincipal) authentication.getPrincipal();
        String subscriptionId = accessor.getSubscriptionId();

        Map<String, String> topics = principal.getTopicSubscriptions();
        if (topics.isEmpty()) {
            return;
        }

        var topicEntry = topics.entrySet().stream()
                .filter(entry -> entry.getValue().equals(subscriptionId))
                .findFirst()
                .orElse(null);

        if (topicEntry == null) {
            return;
        }

        String topic = topicEntry.getKey();
        topics.remove(topic);

        if (topic.startsWith(TOPIC_LOBBY)) {
            log.debug("Player {} unsubscribed from lobby {}", principal.getNickname(), principal.getLobbyId());
            handleLobbyLeave(principal);
        } else if (topic.startsWith(TOPIC_GAME)) {
            log.debug("Player {} unsubscribed from game {}", principal.getNickname(), principal.getGameSessionId());
            handleGameLeave(principal);
        }
    }

    private void claimLockIfNotHeld(StompHeaderAccessor accessor) {
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes != null) {
            ReentrantLock lock = (ReentrantLock) sessionAttributes.get("socketLock");
            if (lock != null && !lock.isHeldByCurrentThread()) {
                lock.lock();
            }
        }
    }

    private void releaseLockIfHeld(UUID playerId, StompHeaderAccessor accessor) {
        String sessionId = accessor.getSessionId();
        claimService.releaseSocket(playerId, sessionId);

        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
        if (sessionAttributes != null) {
            ReentrantLock lock = (ReentrantLock) sessionAttributes.remove("socketLock");
            if (lock != null && lock.isHeldByCurrentThread()) {
                lock.unlock();
            }
        }
    }

    private void handleLobbyLeave(WebSocketPrincipal principal) {
        if (principal.getLobbyId() != null) {
            lobbyService.removePlayer(principal.getLobbyId(), principal.getPlayerId());
        }
    }

    private void handleGameLeave(WebSocketPrincipal principal) {
        if (principal.getGameSessionId() != null) {
            handleGameLeave(principal, principal.getGameSessionId());
        }
    }

    private void handleGameLeave(WebSocketPrincipal principal, UUID gameSessionId) {
        if (gameSessionId != null) {
            String gameTopic = TOPIC_GAME + gameSessionId;
            gameSessionService.removeConnectedPlayer(gameSessionId, principal.getPlayerId());
            simpMessagingTemplate.convertAndSend(
                    gameTopic,
                    new GameEventResponseDto(
                            GameEventType.GAME_DISCONNECT,
                            new GameEventPayload(gameSessionId, null, principal.getPlayerId())
                    )
            );
        }
    }
}
