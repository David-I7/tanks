package com.tanks.server.websocket.services;

import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RedisClaimService {

    private final ConcurrentHashMap<Long, String> activeSockets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, Long> lobbyJoins = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, Long> gameCreations = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, Boolean> gameStarts = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Boolean> reloadRequired = new ConcurrentHashMap<>();

    public boolean claimSocket(Long userId, String socketSessionId) {
        String existing = activeSockets.putIfAbsent(userId, socketSessionId);
        return existing == null || existing.equals(socketSessionId);
    }

    public void refreshSocketClaim(Long userId) {
        // No-op: in-memory maps do not require TTL refreshing.
    }

    public void releaseSocket(Long userId, String socketSessionId) {
        if (socketSessionId == null) {
            return;
        }
        activeSockets.remove(userId, socketSessionId);
    }

    public boolean claimLobbyJoin(UUID lobbyId, Long userId) {
        return lobbyJoins.putIfAbsent(lobbyId, userId) == null;
    }

    public void releaseLobbyJoin(UUID lobbyId, Long userId) {
        lobbyJoins.remove(lobbyId, userId);
    }

    public void deleteLobbyJoin(UUID lobbyId) {
        lobbyJoins.remove(lobbyId);
    }

    public boolean claimGameCreation(UUID lobbyId, Long hostId) {
        return gameCreations.putIfAbsent(lobbyId, hostId) == null;
    }

    public void releaseGameCreation(UUID lobbyId, Long hostId) {
        gameCreations.remove(lobbyId, hostId);
    }

    public void deleteGameCreation(UUID lobbyId) {
        gameCreations.remove(lobbyId);
    }

    public boolean claimGameStart(UUID gameSessionId) {
        return gameStarts.putIfAbsent(gameSessionId, true) == null;
    }

    public void deleteGameStart(UUID gameSessionId) {
        gameStarts.remove(gameSessionId);
    }

    public void markUserSessionReloadRequired(Long userId) {
        reloadRequired.put(userId, true);
    }

    public boolean consumeUserSessionReloadRequired(Long userId) {
        return reloadRequired.remove(userId) != null;
    }

    public void deleteUserSessionReloadRequired(Long userId) {
        reloadRequired.remove(userId);
    }
}
