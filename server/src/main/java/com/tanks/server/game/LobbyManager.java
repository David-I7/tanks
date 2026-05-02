package com.tanks.server.game;

import com.tanks.server.utils.IdFactory;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class LobbyManager {
    private ConcurrentHashMap<String, Lobby> activeLobbies = new ConcurrentHashMap<>();
    private IdFactory idFactory;

    public LobbyManager(IdFactory idFactory){
        this.idFactory = idFactory;
    }

    public String createLobby(String hostId){
        String lobbyId;
        Lobby lobby = new Lobby();
        lobby.setHostId(hostId);

        while(true){
            lobbyId = idFactory.randomAlphaNumID();
            if (activeLobbies.containsKey(lobbyId)) continue;
            lobby.setLobbyId(lobbyId);
            break;
        }

        return lobbyId;
    }
}
