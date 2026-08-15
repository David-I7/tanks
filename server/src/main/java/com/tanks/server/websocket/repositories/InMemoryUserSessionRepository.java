package com.tanks.server.websocket.repositories;

import com.tanks.server.websocket.entities.userSession.UserSession;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Repository
public class InMemoryUserSessionRepository implements UserSessionRepository {

    private final ConcurrentHashMap<Long, UserSession> store = new ConcurrentHashMap<>();

    @Override
    public <S extends UserSession> S save(S entity) {
        if (entity == null || entity.getId() == null) {
            throw new IllegalArgumentException("Entity or ID cannot be null");
        }
        store.put(entity.getId(), entity);
        return entity;
    }

    @Override
    public <S extends UserSession> Iterable<S> saveAll(Iterable<S> entities) {
        for (S entity : entities) {
            save(entity);
        }
        return entities;
    }

    @Override
    public Optional<UserSession> findById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public boolean existsById(Long id) {
        return id != null && store.containsKey(id);
    }

    @Override
    public Iterable<UserSession> findAll() {
        return new java.util.ArrayList<>(store.values());
    }

    @Override
    public Iterable<UserSession> findAllById(Iterable<Long> ids) {
        java.util.List<UserSession> list = new java.util.ArrayList<>();
        for (Long id : ids) {
            findById(id).ifPresent(list::add);
        }
        return list;
    }

    @Override
    public long count() {
        return store.size();
    }

    @Override
    public void deleteById(Long id) {
        if (id != null) {
            store.remove(id);
        }
    }

    @Override
    public void delete(UserSession entity) {
        if (entity != null && entity.getId() != null) {
            store.remove(entity.getId());
        }
    }

    @Override
    public void deleteAllById(Iterable<? extends Long> ids) {
        for (Long id : ids) {
            deleteById(id);
        }
    }

    @Override
    public void deleteAll(Iterable<? extends UserSession> entities) {
        for (UserSession entity : entities) {
            delete(entity);
        }
    }

    @Override
    public void deleteAll() {
        store.clear();
    }
}
