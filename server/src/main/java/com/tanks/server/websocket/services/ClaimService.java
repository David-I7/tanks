package com.tanks.server.websocket.services;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class ClaimService {

    private final ConcurrentHashMap<Long, String> activeSockets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Boolean> reloadRequired = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, ReentrantLock> socketLocks = new ConcurrentHashMap<>();

    public boolean claimSocket(Long userId, String socketSessionId) {
        String existing = activeSockets.putIfAbsent(userId, socketSessionId);
        boolean socketClaimed = existing == null || existing.equals(socketSessionId);
        if (socketClaimed) {
            socketLocks.putIfAbsent(userId, new ReentrantLock());
        }
        return socketClaimed;
    }

    public void releaseSocket(Long userId, String socketSessionId) {
        if (socketSessionId == null) {
            return;
        }
        activeSockets.remove(userId, socketSessionId);
        socketLocks.remove(userId);
    }

    public ReentrantLock getSocketLock(Long userId) {
        return socketLocks.get(userId);
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
