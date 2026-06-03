package com.tanks.server.websocket.repositories;

import com.tanks.server.websocket.entities.gameSession.Game;
import org.springframework.data.repository.CrudRepository;

import java.util.UUID;

public interface GameSessionRepository extends CrudRepository<Game, UUID> {
}
