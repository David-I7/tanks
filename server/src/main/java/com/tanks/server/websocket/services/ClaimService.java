package com.tanks.server.websocket.services;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class ClaimService {

    private final ConcurrentHashMap<Long, String> activeSockets = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Boolean> reloadRequired = new ConcurrentHashMap<>();

    public boolean claimSocket(Long userId, String socketSessionId) {
        String existing = activeSockets.putIfAbsent(userId, socketSessionId);
        return existing == null || existing.equals(socketSessionId);
    }

    public void releaseSocket(Long userId, String socketSessionId) {
        if (socketSessionId == null) {
            return;
        }
        activeSockets.remove(userId, socketSessionId);
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
