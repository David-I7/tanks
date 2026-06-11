package com.tanks.server.websocket.services;

import com.tanks.server.entities.User;
import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.lobby.LobbyEventPayload;
import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;
import com.tanks.server.websocket.dto.lobby.LobbyEventType;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.events.LobbyEvent;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.AllArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;


@Service
@AllArgsConstructor
public class LobbyService {

    private final LobbyRepository lobbyRepository;

    private final QuickMatchService quickMatchService;

    private final UserSessionService userSessionService;

    private final GameSessionService gameSessionService;

    private final ApplicationEventPublisher eventPublisher;

    public Lobby create(UserSession userSession, LobbyType type) {
        UUID uuid = IdFactory.randomUUID();
        Lobby lobby = Lobby.builder()
                .hostId(userSession.getId())
                .type(type)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .id(uuid)
                .build();

        lobbyRepository.save(lobby);
        if (lobby.getType() == LobbyType.QUICK_MATCH) {
            quickMatchService.create(lobby);
        }

        userSession.transitionToLobby(uuid);
        userSessionService.save(userSession);

        eventPublisher.publishEvent(new LobbyEvent(this, userSession.getUsername(), "/queue/replies",
                new LobbyEventResponseDto(LobbyEventType.LOBBY_CREATED, "@SERVER", new LobbyEventPayload(uuid, userSession.getUsername()))));

        return lobby;
    }

    public void join(UUID lobbyId, UserSession userSession) {

        Lobby lobby = findById(lobbyId);

        // The user is trying to connect multiple times (ex: multiple open tabs).
        if (isFullLobby(lobby))
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Lobby is full.", URI.create("/lobby/join/private/" + lobbyId));

        // New user has joined
        lobby.setOpponentId(userSession.getId());
        lobby.setStatus(LobbyStatus.READY);
        lobbyRepository.save(lobby);

        userSession.transitionToLobby(lobbyId);
        userSessionService.save(userSession);

        eventPublisher.publishEvent(new LobbyEvent(this, userSession.getUsername(), "/queue/replies",
                new LobbyEventResponseDto(LobbyEventType.LOBBY_JOINED, "@SERVER", new LobbyEventPayload(lobbyId, userSession.getUsername()))));
    }

    public void joinQuickMatch(UserSession userSession) {
        Optional<Lobby> lobbyOpt = findBestQuickMatch();

        if (lobbyOpt.isPresent()) {
            Lobby quickMatchLobby = lobbyOpt.get();
            join(quickMatchLobby.getId(), userSession);
            removeQuickMatch(quickMatchLobby);

            gameSessionService.create(quickMatchLobby);
        } else {
            create(userSession, LobbyType.QUICK_MATCH);
        }
    }

    public void removeUser(UUID lobbyId, User user) {

        Lobby lobby = findById(lobbyId);

        if (!isConnectedUser(lobby, user))
            throw new IllegalStateException("The provided user is not connected to the lobby " + lobbyId);

        if (lobby.getOpponentId() == null) {
            delete(lobby);
        } else {
            if (lobby.getHostId().equals(user.getId())) {
                lobby.setHostId(lobby.getOpponentId());
            }

            lobby.setOpponentId(null);
            lobby.setStatus(LobbyStatus.WAITING_FOR_OPPONENT);
            lobbyRepository.save(lobby);
        }
    }

    public void delete(Lobby lobby) {
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

    public Lobby findById(UUID lobbyId){
        Lobby lobby = lobbyRepository.findById(lobbyId)
                .orElseThrow(() ->new ProblemDetailException(HttpStatus.NOT_FOUND,"The lobby with the provided id does not exist.", URI.create("about:blank")));

        return lobby;
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
