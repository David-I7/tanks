package com.tanks.server.websocket.repositories;

import com.tanks.server.websocket.entities.lobby.Lobby;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.NoRepositoryBean;

import java.util.UUID;

@NoRepositoryBean
public interface LobbyRepository extends CrudRepository<Lobby,UUID> {

}
