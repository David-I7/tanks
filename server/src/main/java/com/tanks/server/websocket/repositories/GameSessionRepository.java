package com.tanks.server.websocket.repositories;

import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.List;
import java.util.UUID;

@NoRepositoryBean
public interface GameSessionRepository extends CrudRepository<GameSession, UUID> {
    List<GameSession> findByState(GameSessionState state);
}
