package com.tanks.server.websocket.services;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RedisClaimService {

    private static final Duration CLAIM_TTL = Duration.ofSeconds(5);

    private static final Duration USER_SESSION_RELOAD_TTL = Duration.ofHours(1);

    private static final DefaultRedisScript<Long> RELEASE_IF_OWNED_SCRIPT = new DefaultRedisScript<>(
            """
            if redis.call('GET', KEYS[1]) == ARGV[1] then
                return redis.call('DEL', KEYS[1])
            end
            return 0
            """,
            Long.class
    );

    private final RedisTemplate<String, Object> redisTemplate;

    public boolean claimSocket(Long userId, String socketSessionId) {
        String key = socketClaimKey(userId);
        Boolean claimed = redisTemplate.opsForValue().setIfAbsent(key, socketSessionId, CLAIM_TTL);

        if (Boolean.TRUE.equals(claimed)) {
            return true;
        }

        Object currentSocketSessionId = redisTemplate.opsForValue().get(key);
        return socketSessionId.equals(currentSocketSessionId);
    }

    public void refreshSocketClaim(Long userId) {
        redisTemplate.expire(socketClaimKey(userId), CLAIM_TTL);
    }

    public void releaseSocket(Long userId, String socketSessionId) {
        if (socketSessionId == null) {
            return;
        }

        releaseIfOwned(socketClaimKey(userId), socketSessionId);
    }

    public boolean claimLobbyJoin(UUID lobbyId, Long userId) {
        return Boolean.TRUE.equals(redisTemplate.opsForValue()
                .setIfAbsent(lobbyJoinClaimKey(lobbyId), userId.toString(), CLAIM_TTL));
    }

    public void releaseLobbyJoin(UUID lobbyId, Long userId) {
        releaseIfOwned(lobbyJoinClaimKey(lobbyId), userId.toString());
    }

    public void deleteLobbyJoin(UUID lobbyId) {
        redisTemplate.delete(lobbyJoinClaimKey(lobbyId));
    }

    public boolean claimGameCreation(UUID lobbyId, Long hostId) {
        return Boolean.TRUE.equals(redisTemplate.opsForValue()
                .setIfAbsent(gameCreateClaimKey(lobbyId), hostId.toString(), CLAIM_TTL));
    }

    public void releaseGameCreation(UUID lobbyId, Long hostId) {
        releaseIfOwned(gameCreateClaimKey(lobbyId), hostId.toString());
    }

    public void deleteGameCreation(UUID lobbyId) {
        redisTemplate.delete(gameCreateClaimKey(lobbyId));
    }

    public boolean claimGameStart(UUID gameSessionId) {
        return Boolean.TRUE.equals(redisTemplate.opsForValue()
                .setIfAbsent(gameStartClaimKey(gameSessionId), "started", CLAIM_TTL));
    }

    public void deleteGameStart(UUID gameSessionId) {
        redisTemplate.delete(gameStartClaimKey(gameSessionId));
    }

    public void markUserSessionReloadRequired(Long userId) {
        redisTemplate.opsForValue().set(userSessionReloadKey(userId), "reload", USER_SESSION_RELOAD_TTL);
    }

    public boolean consumeUserSessionReloadRequired(Long userId) {
        return redisTemplate.opsForValue().getAndDelete(userSessionReloadKey(userId)) != null;
    }

    public void deleteUserSessionReloadRequired(Long userId) {
        redisTemplate.delete(userSessionReloadKey(userId));
    }

    private void releaseIfOwned(String key, String owner) {
        redisTemplate.execute(RELEASE_IF_OWNED_SCRIPT, Collections.singletonList(key), owner);
    }

    private String socketClaimKey(Long userId) {
        return "claim:user-socket:" + userId;
    }

    private String lobbyJoinClaimKey(UUID lobbyId) {
        return "claim:lobby-join:" + lobbyId;
    }

    private String gameCreateClaimKey(UUID lobbyId) {
        return "claim:game-create:" + lobbyId;
    }

    private String gameStartClaimKey(UUID gameSessionId) {
        return "claim:game-start:" + gameSessionId;
    }

    private String userSessionReloadKey(Long userId) {
        return "claim:user-session-reload:" + userId;
    }
}
