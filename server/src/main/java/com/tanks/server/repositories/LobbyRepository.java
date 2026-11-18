package com.tanks.server.repositories;

import com.tanks.server.domain.Lobby;

import java.util.UUID;

public interface LobbyRepository extends CrudRepository<Lobby, UUID> {
}
