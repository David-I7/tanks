package com.tanks.server.websocket.services;

import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@AllArgsConstructor
public class QuickMatchService {

    private final String QUICK_MATCH_KEY = "quick_match";

    private final LobbyRepository lobbyRepository;

    private final RedisTemplate<String,Object> redisTemplate;

    public Optional<Lobby> popBestQuickMatch(){
        ZSetOperations.TypedTuple<Object> lobbyTuple;

        while ((lobbyTuple = redisTemplate.opsForZSet().popMin(QUICK_MATCH_KEY)) != null) {
            Object lobbyId = lobbyTuple.getValue();

            if(lobbyId == null) {
                continue;
            }

            Optional<Lobby> lobby;
            try {
                lobby = lobbyRepository.findById(UUID.fromString(lobbyId.toString()));
            } catch (IllegalArgumentException ex) {
                continue;
            }

            if(lobby.filter(this::isValidWaitingQuickMatchLobby).isPresent()) {
                return lobby;
            }
        }

        return Optional.empty();
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

    private boolean isValidWaitingQuickMatchLobby(Lobby lobby) {
        return lobby.getType() == LobbyType.QUICK_MATCH
                && lobby.getStatus() == LobbyStatus.WAITING_FOR_OPPONENT
                && lobby.getHostId() != null
                && lobby.getOpponentId() == null;
    }

}
