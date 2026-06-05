package com.tanks.server.websocket.services;

import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.entities.User;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
@AllArgsConstructor
public class QuickMatchService {

    private final String QUICK_MATCH_KEY = "quick_match";

    private final LobbyRepository lobbyRepository;

    private final RedisTemplate<String,Object> redisTemplate;

    public Optional<Lobby> findBestQuickMatch(){
        Set<Object> lobbyIds =  redisTemplate.opsForZSet().range(QUICK_MATCH_KEY,0,0);

        if(lobbyIds == null || lobbyIds.isEmpty()){
            return Optional.empty();
        }

        String lobbyId = (String)lobbyIds.iterator().next();

        return lobbyRepository.findById(UUID.fromString(lobbyId));
    }

    public void delete(Lobby lobby){
        redisTemplate.opsForZSet().remove(QUICK_MATCH_KEY,lobby.getId().toString());
    }

    public Lobby create(Lobby lobby){
        redisTemplate.opsForZSet().add(QUICK_MATCH_KEY,lobby.getId().toString(),computeScore());
        return lobby;
    }

    private double computeScore(){
        return Instant.now().toEpochMilli() / 1000.0 / 60 / 60;
    }

}
