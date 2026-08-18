package com.tanks.server.websocket.repositories;

import com.tanks.server.websocket.entities.lobby.Lobby;
import org.springframework.stereotype.Repository;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryLobbyRepository implements LobbyRepository {

    private final ConcurrentHashMap<UUID, Lobby> store = new ConcurrentHashMap<>();

    @Override
    public <S extends Lobby> S save(S entity) {
        if (entity == null || entity.getId() == null) {
            throw new IllegalArgumentException("Entity or ID cannot be null");
        }
        store.put(entity.getId(), entity);
        return entity;
    }

    @Override
    public <S extends Lobby> Iterable<S> saveAll(Iterable<S> entities) {
        for (S entity : entities) {
            save(entity);
        }
        return entities;
    }

    @Override
    public Optional<Lobby> findById(UUID id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public boolean existsById(UUID id) {
        return id != null && store.containsKey(id);
    }

    @Override
    public Iterable<Lobby> findAll() {
        return new ArrayList<>(store.values());
    }

    @Override
    public Iterable<Lobby> findAllById(Iterable<UUID> ids) {
        List<Lobby> list = new ArrayList<>();
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
    public void delete(Lobby entity) {
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
    public void deleteAll(Iterable<? extends Lobby> entities) {
        for (Lobby entity : entities) {
            delete(entity);
        }
    }

    @Override
    public void deleteAll() {
        store.clear();
    }
}
