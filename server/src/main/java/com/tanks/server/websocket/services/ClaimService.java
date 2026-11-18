package com.tanks.server.websocket.services;

import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class ClaimService {

    private final ConcurrentHashMap<UUID, String> activeSockets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<UUID, ReentrantLock> socketLocks = new ConcurrentHashMap<>();

    public boolean claimSocket(UUID playerId, String socketSessionId) {
        String existing = activeSockets.putIfAbsent(playerId, socketSessionId);
        boolean socketClaimed = existing == null || existing.equals(socketSessionId);
        if (socketClaimed) {
            socketLocks.putIfAbsent(playerId, new ReentrantLock());
        }
        return socketClaimed;
    }

    public void releaseSocket(UUID playerId, String socketSessionId) {
        if (socketSessionId == null) {
            return;
        }
        activeSockets.remove(playerId, socketSessionId);
        socketLocks.remove(playerId);
    }

    public boolean isPlayerConnected(UUID playerId) {
        return playerId != null && activeSockets.containsKey(playerId);
    }

    public ReentrantLock getSocketLock(UUID playerId) {
        return socketLocks.get(playerId);
    }
}
