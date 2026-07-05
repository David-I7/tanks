package com.tanks.server.websocket.services;

import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class LobbyReconnectService {

    private static final String LOBBY_RECONNECT_DEADLINES_KEY = "lobbyReconnectDeadlines";

    private static final String TOPIC_LOBBY = "/topic/lobby/";

    private final RedisTemplate<String, Object> redisTemplate;

    private final UserSessionService userSessionService;

    private final LobbyService lobbyService;

    @Value("${app.websocket.lobby.max-reconnect-ms}")
    private long maxReconnectMs;

    @Value("${app.websocket.lobby.reconnect-sweep-limit}")
    private int sweepLimit;

    public void markDisconnected(UserSession userSession) {
        UUID lobbyId = userSession.getLobbyId();
        if (lobbyId == null) {
            return;
        }

        String lobbyTopic = TOPIC_LOBBY + lobbyId;
        Map<String, String> topics = userSession.getTopicSubscriptions();
        if (topics != null) {
            topics.remove(lobbyTopic);
            if (topics.isEmpty()) {
                userSession.setTopicSubscriptions(null);
            }
        }

        Instant deadline = Instant.now().plusMillis(maxReconnectMs);
        userSession.setSocketSessionId(null);
        userSession.setReconnectDeadlineAt(deadline);
        userSessionService.save(userSession);

        redisTemplate.opsForZSet().add(
                LOBBY_RECONNECT_DEADLINES_KEY,
                reconnectMember(userSession.getId(), lobbyId),
                deadline.toEpochMilli()
        );
    }

    public void markConnected(UserSession userSession) {
        UUID lobbyId = userSession.getLobbyId();
        if (lobbyId == null) {
            return;
        }

        userSession.setReconnectDeadlineAt(null);
        userSessionService.save(userSession);
        redisTemplate.opsForZSet().remove(
                LOBBY_RECONNECT_DEADLINES_KEY,
                reconnectMember(userSession.getId(), lobbyId)
        );
    }

    @Scheduled(fixedDelayString = "${app.websocket.lobby.reconnect-sweep-ms:1000}", timeUnit = TimeUnit.MILLISECONDS)
    public void removeExpiredReconnects() {
        long now = Instant.now().toEpochMilli();
        Set<Object> dueReconnects;
        try {
            dueReconnects = redisTemplate.opsForZSet()
                    .rangeByScore(LOBBY_RECONNECT_DEADLINES_KEY, 0, now, 0, sweepLimit);
        } catch (RuntimeException ex) {
            log.debug("Skipping lobby reconnect sweep because Redis is unavailable", ex);
            return;
        }

        if (dueReconnects == null || dueReconnects.isEmpty()) {
            return;
        }

        for (Object dueReconnect : dueReconnects) {
            String member = String.valueOf(dueReconnect);
            Long removed = redisTemplate.opsForZSet().remove(LOBBY_RECONNECT_DEADLINES_KEY, member);
            if (removed == null || removed == 0) {
                continue;
            }

            removeIfStillDisconnected(member, now);
        }
    }

    private void removeIfStillDisconnected(String member, long now) {
        ReconnectMember reconnectMember = parseReconnectMember(member);
        if (reconnectMember == null) {
            log.debug("Skipping malformed lobby reconnect member '{}'", member);
            return;
        }

        UserSession userSession;
        try {
            userSession = userSessionService.findById(reconnectMember.userId());
        } catch (ProblemDetailException ex) {
            if (ex.getStatus().equals(HttpStatus.NOT_FOUND)) {
                return;
            }
            throw ex;
        }

        if (!isExpiredLobbyDisconnect(userSession, reconnectMember.lobbyId(), now)) {
            return;
        }

        lobbyService.removeUser(userSession);
        userSessionService.delete(userSession);
    }

    private boolean isExpiredLobbyDisconnect(UserSession userSession, UUID lobbyId, long now) {
        return userSession.getState() == UserSessionState.IN_LOBBY
                && lobbyId.equals(userSession.getLobbyId())
                && !userSessionService.isConnectedToLobby(userSession)
                && userSession.getReconnectDeadlineAt() != null
                && userSession.getReconnectDeadlineAt().toEpochMilli() <= now;
    }

    private String reconnectMember(Long userId, UUID lobbyId) {
        return userId + ":" + lobbyId;
    }

    private ReconnectMember parseReconnectMember(String member) {
        String[] parts = member.split(":", 2);
        if (parts.length != 2) {
            return null;
        }

        try {
            return new ReconnectMember(Long.parseLong(parts[0]), UUID.fromString(parts[1]));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private record ReconnectMember(Long userId, UUID lobbyId) {
    }
}
