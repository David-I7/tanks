package com.tanks.server.services;

import com.tanks.server.entities.Lobby;
import com.tanks.server.entities.User;
import com.tanks.server.repositories.LobbyRepository;
import com.tanks.server.utils.IdFactory;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;
import java.util.UUID;


@Service
@AllArgsConstructor
public class LobbyService {

    private final LobbyRepository lobbyRepository;

    public Lobby create(Lobby.Type lobbyType, User user){

        Lobby lobby = Lobby.builder()
                .hostId(user.getId())
                .opponentId(null)
                .status(Lobby.Status.WAITING)
                .type(lobbyType)
                .id(IdFactory.randomUUID())
                .build();

        return lobbyRepository.save(lobby);
    }

    public boolean canJoin(UUID lobbyId){

        Optional<Lobby> optionalLobby = lobbyRepository.findById(lobbyId);

        if(optionalLobby.isPresent()){
            Lobby lobby = optionalLobby.get();
            if(lobby.getOpponentId() == null){
                return true;
            }else return false;
        }else throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }


}
