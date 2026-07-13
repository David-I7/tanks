package com.tanks.server.websocket.repositories;

import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryGameSessionRepository implements GameSessionRepository {

    private final ConcurrentHashMap<UUID, GameSession> store = new ConcurrentHashMap<>();

    @Override
    public List<GameSession> findByState(GameSessionState state) {
        if (state == null) {
            return List.of();
        }
        return store.values().stream()
                .filter(gs -> state.equals(gs.getState()))
                .map(GameSession::new)
                .toList();
    }

    @Override
    public <S extends GameSession> S save(S entity) {
        if (entity == null || entity.getId() == null) {
            throw new IllegalArgumentException("Entity or ID cannot be null");
        }
        GameSession copy = new GameSession(entity);
        store.put(entity.getId(), copy);
        return entity;
    }

    @Override
    public <S extends GameSession> Iterable<S> saveAll(Iterable<S> entities) {
        for (S entity : entities) {
            save(entity);
        }
        return entities;
    }

    @Override
    public Optional<GameSession> findById(UUID id) {
        if (id == null) {
            return Optional.empty();
        }
        GameSession value = store.get(id);
        return Optional.ofNullable(value).map(GameSession::new);
    }

    @Override
    public boolean existsById(UUID id) {
        return id != null && store.containsKey(id);
    }

    @Override
    public Iterable<GameSession> findAll() {
        return store.values().stream().map(GameSession::new).toList();
    }

    @Override
    public Iterable<GameSession> findAllById(Iterable<UUID> ids) {
        java.util.List<GameSession> list = new java.util.ArrayList<>();
        for (UUID id : ids) {
            findById(id).ifPresent(list::add);
        }
        return list;
    }

    @Override
    public long count() {
        return store.size();
    }

    @Override
    public void deleteById(UUID id) {
        if (id != null) {
            store.remove(id);
        }
    }

    @Override
    public void delete(GameSession entity) {
        if (entity != null && entity.getId() != null) {
            store.remove(entity.getId());
        }
    }

    @Override
    public void deleteAllById(Iterable<? extends UUID> ids) {
        for (UUID id : ids) {
            deleteById(id);
        }
    }

    @Override
    public void deleteAll(Iterable<? extends GameSession> entities) {
        for (GameSession entity : entities) {
            delete(entity);
        }
    }

    @Override
    public void deleteAll() {
        store.clear();
    }
}
