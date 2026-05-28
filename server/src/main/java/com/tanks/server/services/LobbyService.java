package com.tanks.server.services;

import com.tanks.server.entities.lobby.Lobby;
import com.tanks.server.entities.User;
import com.tanks.server.entities.lobby.LobbyPlayerState;
import com.tanks.server.entities.lobby.LobbyStatus;
import com.tanks.server.entities.lobby.LobbyType;
import com.tanks.server.repositories.LobbyRepository;
import com.tanks.server.utils.IdFactory;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;


@Service
@AllArgsConstructor
public class LobbyService {

    private final LobbyRepository lobbyRepository;

    private long DEFAULT_LOBBY_CONNECTION_TIMEOUT = 15; // 15 seconds

    public Lobby create(LobbyType lobbyType, User user){

        Lobby lobby = Lobby.builder()
                .hostId(user.getId())
                .hostState(LobbyPlayerState.RESERVED)
                .opponentId(null)
                .opponentState(LobbyPlayerState.OPEN)
                .opponentReservedAt(0)
                .status(LobbyStatus.WAITING_FOR_HOST_CONNECTION)
                .type(lobbyType)
                .id(IdFactory.randomUUID())
                .expirationSeconds(DEFAULT_LOBBY_CONNECTION_TIMEOUT)
                .build();

        return lobbyRepository.save(lobby);
    }

    public void join(UUID lobbyId, User user){

        Lobby lobby = lobbyRepository.findById(lobbyId)
                .orElseThrow(() ->new ResponseStatusException(HttpStatus.NOT_FOUND));

        // Lobby is full, and the user is not part of the current lobby members
        if(isFullLobby(lobby)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);

        if (user.getId() == lobby.getHostId()){

            switch (lobby.getHostState()){
                // Case 1: the host has refreshed the page => he should be disconnected and is allowed to reconnect
                case DISCONNECTED -> {
                    return;
                }
                // Case 2: the host has opened a new tab with the same lobby id
                // I will prevent this for now
                case CONNECTED -> {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN);
                }
                // Case 3: the spot has been reserved, but the user has not connected yet
                // Let the default ttl handle this
                case RESERVED -> {
                    return;
                }
                default -> throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }

        }

        if (user.getId().equals(lobby.getOpponentId())) {

            switch (lobby.getOpponentState()) {
                // Case 1: the opponent has refreshed the page => he should be disconnected and is allowed to reconnect
                case DISCONNECTED -> {
                    return;
                }
                // Case 2: the opponent has opened a new tab with the same lobby id
                // I will prevent this for now
                case CONNECTED -> {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN);
                }
                case RESERVED -> {break;}
                default -> throw new ResponseStatusException(HttpStatus.FORBIDDEN);
            }
        }

        switch (lobby.getOpponentState()){

            case OPEN -> {
                lobby.setOpponentState(LobbyPlayerState.RESERVED);
                lobby.setOpponentId(user.getId());
                lobby.setOpponentReservedAt(getConnectionTimeout());
                lobbyRepository.save(lobby);
                return;
            }

            case RESERVED -> {

                // reservation expired (checked earlier
                lobby.setOpponentId(user.getId());
                lobby.setOpponentReservedAt(getConnectionTimeout());
                lobbyRepository.save(lobby);
                return;
            }

            default -> throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }

    }

    private boolean isConnectionAttemptExpired(Lobby lobby){
        return lobby.getOpponentReservedAt() - Instant.EPOCH.getEpochSecond() < 0;
    }

    private long getConnectionTimeout(){
        return Instant.EPOCH.getEpochSecond() + DEFAULT_LOBBY_CONNECTION_TIMEOUT;
    }

    private boolean isFullLobby(Lobby lobby){
        return (lobby.getHostState() == LobbyPlayerState.CONNECTED || lobby.getHostState() == LobbyPlayerState.DISCONNECTED)
        && ((lobby.getOpponentState() == LobbyPlayerState.CONNECTED || lobby.getOpponentState() == LobbyPlayerState.DISCONNECTED)
                || (lobby.getOpponentState() == LobbyPlayerState.RESERVED && !isConnectionAttemptExpired(lobby)));
    }

}
