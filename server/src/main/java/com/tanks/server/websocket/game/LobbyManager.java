package com.tanks.server.websocket.game;

import com.tanks.server.utils.IdFactory;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class LobbyManager {
    private ConcurrentHashMap<String, Lobby> activeLobbies = new ConcurrentHashMap<>();

    public String createLobby(String hostId){
        String lobbyId;
        Lobby lobby = new Lobby();
        lobby.setHostId(hostId);

        while(true){
            lobbyId = IdFactory.randomAlphaNumID();
            if (activeLobbies.containsKey(lobbyId)) continue;
            lobby.setLobbyId(lobbyId);
            break;
        }

        return lobbyId;
    }
}
