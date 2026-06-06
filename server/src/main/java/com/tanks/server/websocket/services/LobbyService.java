package com.tanks.server.websocket.services;

import com.tanks.server.entities.User;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;


@Service
@AllArgsConstructor
public class LobbyService {

    private final LobbyRepository lobbyRepository;

    private final QuickMatchService quickMatchService;

    private final SimpMessagingTemplate messagingTemplate;

    public Lobby create(Lobby lobby){

        lobbyRepository.save(lobby);
        if(lobby.getType() == LobbyType.QUICK_MATCH){
            quickMatchService.create(lobby);
        }

        return lobby;
    }

    public void join(UUID lobbyId, User user){

        Lobby lobby = lobbyRepository.findById(lobbyId)
                .orElseThrow(() ->new ProblemDetailException(HttpStatus.NOT_FOUND,"The lobby with the provided id does not exist.", URI.create("/lobby/join/private/" + lobbyId)));

        // The user is trying to connect multiple times (ex: multiple open tabs).
        if (isFullLobby(lobby)) throw new ProblemDetailException(HttpStatus.BAD_REQUEST,"Lobby is full.", URI.create("/lobby/join/private/" + lobbyId));

        // New user has joined
        lobby.setOpponentId(user.getId());
        lobby.setStatus(LobbyStatus.READY);
        lobbyRepository.save(lobby);
    }


    public void removeUser(UUID lobbyId, User user){

        Lobby lobby = lobbyRepository.findById(lobbyId)
                .orElseThrow(() -> new IllegalStateException("The lobby with the provided id does not exist."));

        if(!isConnectedUser(lobby,user)) throw new IllegalStateException("The provided user is not connected to the lobby " + lobbyId );

        if(lobby.getOpponentId() == null){
            delete(lobby);
        }else{
            if (lobby.getHostId().equals(user.getId())){
                lobby.setHostId(lobby.getOpponentId());
            }

            lobby.setOpponentId(null);
            lobby.setStatus(LobbyStatus.WAITING_FOR_OPPONENT);
            lobbyRepository.save(lobby);
        }
    }

    public void delete(Lobby lobby){
        lobbyRepository.delete(lobby);
        if(lobby.getType() == LobbyType.QUICK_MATCH){
            quickMatchService.delete(lobby);
        }
    }

    public void removeQuickMatch(Lobby lobby){
        quickMatchService.delete(lobby);
    }

    public Optional<Lobby> findBestQuickMatch(){
        return quickMatchService.findBestQuickMatch();
    }

    private boolean isFullLobby(Lobby lobby){
        return (lobby.getHostId() != null)
        && (lobby.getOpponentId() != null);
    }

    private boolean isConnectedUser(Lobby lobby, User user){
        return user.getId().equals(lobby.getOpponentId())
                || user.getId().equals(lobby.getHostId());
    }

}
