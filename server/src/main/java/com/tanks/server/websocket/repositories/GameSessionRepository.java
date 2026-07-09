package com.tanks.server.websocket.repositories;

import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import org.springframework.data.repository.CrudRepository;

import java.util.List;
import java.util.UUID;

public interface GameSessionRepository extends CrudRepository<GameSession, UUID> {
    List<GameSession> findByState(GameSessionState state);
}
