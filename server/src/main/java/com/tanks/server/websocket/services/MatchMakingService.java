package com.tanks.server.websocket.services;

import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.entities.User;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class MatchMakingService {

    private LobbyService lobbyService;

    public Lobby findOrCreateLobby(User user){

        return null;

    }

}
