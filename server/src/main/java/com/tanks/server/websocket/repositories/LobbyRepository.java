package com.tanks.server.websocket.repositories;

import com.tanks.server.entities.lobby.Lobby;
import org.springframework.data.repository.CrudRepository;

import java.util.UUID;

public interface LobbyRepository extends CrudRepository<Lobby,UUID> {

}
