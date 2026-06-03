package com.tanks.server.websocket.services;

import com.tanks.server.websocket.entities.gameSession.Game;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@AllArgsConstructor
public class GameService {

    private GameSessionRepository gameRepository;

    public Game create(UUID id){

        Game game = Game.builder()
                        .id(id)
                        .build();

        return gameRepository.save(game);
    }
}
