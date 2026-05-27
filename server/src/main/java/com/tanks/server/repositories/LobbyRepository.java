package com.tanks.server.repositories;

import com.tanks.server.entities.Lobby;
import org.springframework.data.repository.CrudRepository;

import java.util.UUID;

public interface LobbyRepository extends CrudRepository<Lobby,UUID> {

}
