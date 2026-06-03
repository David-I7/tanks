package com.tanks.server.websocket.services;

import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.entities.User;
import com.tanks.server.websocket.entities.lobby.LobbyPlayerState;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.LobbyRepository;
import com.tanks.server.utils.IdFactory;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.UUID;


@Service
@AllArgsConstructor
public class LobbyService {

    private final LobbyRepository lobbyRepository;

    private final SimpMessagingTemplate messagingTemplate;

    public Lobby create(LobbyType lobbyType, User user){

        Lobby lobby = Lobby.builder()
                .hostId(user.getId())
                .hostState(LobbyPlayerState.CONNECTED)
                .opponentId(null)
                .opponentState(LobbyPlayerState.OPEN)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .type(lobbyType)
                .id(IdFactory.randomUUID())
                .build();

        return lobbyRepository.save(lobby);
    }

    public void join(UUID lobbyId, User user){

        Lobby lobby = lobbyRepository.findById(lobbyId)
                .orElseThrow(() ->new ProblemDetailException(HttpStatus.NOT_FOUND,"The lobby with the provided id does not exist.", URI.create("/lobby/join/" + lobbyId)));

        // Lobby is full, and the user is not part of the current lobby members, or he is trying to open multiple tabs.
        if(isFullLobby(lobby) || isConnectedUser(lobby,user)) throw new ProblemDetailException(HttpStatus.FORBIDDEN,"The lobby with the provided id is full.", URI.create("/lobby/join/" + lobbyId));

        if (user.getId() == lobby.getHostId()){

            switch (lobby.getHostState()){
                // Case 1: the host has refreshed the page => he should be disconnected and is allowed to reconnect
                case DISCONNECTED -> {
                    lobby.setHostState(LobbyPlayerState.CONNECTED);
                    lobbyRepository.save(lobby);
                    return;
                }
                default -> throw new IllegalStateException("Illegal state");
            }

        }

        if (user.getId().equals(lobby.getOpponentId())) {

            switch (lobby.getOpponentState()) {
                // Case 1: the opponent has refreshed the page => he should be disconnected and is allowed to reconnect
                case DISCONNECTED -> {
                    lobby.setOpponentState(LobbyPlayerState.CONNECTED);
                    lobbyRepository.save(lobby);
                    return;
                }
                default -> throw new IllegalStateException("Illegal state");
            }
        }

        // New user has joined
        lobby.setOpponentState(LobbyPlayerState.CONNECTED);
        lobby.setOpponentId(user.getId());
        lobbyRepository.save(lobby);
    }

    public void disconnect(UUID lobbyId, User user){

        Lobby lobby = lobbyRepository.findById(lobbyId)
                .orElseThrow(() -> new IllegalStateException("The lobby with the provided id does not exist."));

        if(!isConnectedUser(lobby,user)) throw new IllegalStateException("The provided user is not connected to the lobby " + lobbyId );


    }

    private boolean isFullLobby(Lobby lobby){
        return (lobby.getHostState() == LobbyPlayerState.CONNECTED || lobby.getHostState() == LobbyPlayerState.DISCONNECTED)
        && (lobby.getOpponentState() == LobbyPlayerState.CONNECTED || lobby.getOpponentState() == LobbyPlayerState.DISCONNECTED);
    }

    private boolean isConnectedUser(Lobby lobby, User user){
        return (lobby.getHostState() == LobbyPlayerState.CONNECTED && lobby.getHostId() == user.getId())
                || (lobby.getOpponentState() == LobbyPlayerState.CONNECTED && lobby.getOpponentId().equals(user.getId()));
    }

}
