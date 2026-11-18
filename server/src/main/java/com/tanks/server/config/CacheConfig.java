package com.tanks.server.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.tanks.server.domain.Lobby;
import com.tanks.server.domain.Player;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Duration;
import java.util.UUID;

@Configuration
public class CacheConfig {

    @Bean
    public Cache<UUID, Lobby> pendingLobbiesCache() {
        return Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofSeconds(10))
                .build();
    }

    @Bean
    public Cache<UUID, Player> pendingPlayerJoinLobbiesCache() {
        return Caffeine.newBuilder()
                .maximumSize(10_000)
                .expireAfterWrite(Duration.ofSeconds(10))
                .build();
    }
}
