package com.tanks.server.websocket.services;

import org.springframework.stereotype.Component;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class KeyLockManager {
    private final ConcurrentHashMap<String, Object> locks = new ConcurrentHashMap<>();

    public Object getLock(String key) {
        return locks.computeIfAbsent(key, k -> new Object());
    }

    public void releaseLock(String key) {
        locks.remove(key);
    }
}
