package com.tanks.server.websocket.services;

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
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;


@Service
@AllArgsConstructor
@Slf4j
public class LobbyService {

    private final LobbyRepository lobbyRepository;

    private final QuickMatchService quickMatchService;

    private final UserSessionService userSessionService;

    private final RedisClaimService redisClaimService;

    private final ApplicationEventPublisher eventPublisher;

    public Lobby create(UserSession userSession, LobbyType type) {
        UserSession originalUserSession = new UserSession(userSession);
        UUID uuid = IdFactory.randomUUID();
        Lobby lobby = Lobby.builder()
                .hostId(userSession.getId())
                .type(type)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .id(uuid)
                .build();

        try {
            lobbyRepository.save(lobby);
            if (lobby.getType() == LobbyType.QUICK_MATCH) {
                quickMatchService.create(lobby);
            }

            userSessionService.transitionToLobby(userSession,uuid);
            userSessionService.save(userSession);

            eventPublisher.publishEvent(new LobbyEvent(this, userSession.getUsername(), "/queue/replies",
                    new LobbyEventResponseDto(LobbyEventType.LOBBY_CREATED, "@SERVER", new LobbyEventPayload(uuid, userSession.getUsername()))));
        } catch (RuntimeException ex) {
            restoreUserSession(userSession, originalUserSession);
            cleanupLobby(lobby);
            throw ex;
        }

        return lobby;
    }

    public void join(UUID lobbyId, UserSession userSession) {

        if (!redisClaimService.claimLobbyJoin(lobbyId, userSession.getId())) {
            throw new ProblemDetailException(HttpStatus.CONFLICT, "Lobby join is already in progress.", URI.create("/lobby/join/private/" + lobbyId));
        }

        Lobby lobby = findById(lobbyId);
        Long originalOpponentId = lobby.getOpponentId();
        LobbyStatus originalStatus = lobby.getStatus();
        UserSession originalUserSession = new UserSession(userSession);

        if (isFullLobby(lobby)) {
            redisClaimService.releaseLobbyJoin(lobbyId, userSession.getId());
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Lobby is full.", URI.create("/lobby/join/private/" + lobbyId));
        }

        try {
            // New user has joined
            lobby.setOpponentId(userSession.getId());
            lobby.setStatus(LobbyStatus.READY);
            lobbyRepository.save(lobby);

            userSessionService.transitionToLobby(userSession,lobbyId);
            userSessionService.save(userSession);

            eventPublisher.publishEvent(new LobbyEvent(this, userSession.getUsername(), "/queue/replies",
                    new LobbyEventResponseDto(LobbyEventType.LOBBY_JOINED, "@SERVER", new LobbyEventPayload(lobbyId, userSession.getUsername()))));
            redisClaimService.deleteLobbyJoin(lobbyId);
        } catch (RuntimeException ex) {
            restoreUserSession(userSession, originalUserSession);
            restoreLobby(lobby, originalOpponentId, originalStatus);
            redisClaimService.releaseLobbyJoin(lobbyId, userSession.getId());
            throw ex;
        }
    }

    public void joinQuickMatch(UserSession userSession) {
        Optional<Lobby> lobbyOpt = popBestQuickMatch();

        if (lobbyOpt.isPresent()) {
            Lobby quickMatchLobby = lobbyOpt.get();
            join(quickMatchLobby.getId(), userSession);
        } else {
            create(userSession, LobbyType.QUICK_MATCH);
        }
    }

    public void removeUser(UserSession userSession) {

        UUID lobbyId = userSession.getLobbyId();

        Lobby lobby = findById(lobbyId);

        if (!isConnectedUser(lobby, userSession.getId()))
            throw new IllegalStateException("The provided user is not connected to the lobby " + lobbyId);

        if (lobby.getOpponentId() == null) {
            delete(lobby);
        } else {
            if (lobby.getHostId().equals(userSession.getId())) {
                lobby.setHostId(lobby.getOpponentId());
            }

            lobby.setOpponentId(null);
            lobby.setStatus(LobbyStatus.WAITING_FOR_OPPONENT);
            lobbyRepository.save(lobby);
            redisClaimService.deleteLobbyJoin(lobby.getId());

            eventPublisher.publishEvent(new LobbyEvent(this,null,
                    "/topic/lobby/" + userSession.getLobbyId(),
                    new LobbyEventResponseDto(
                            LobbyEventType.LOBBY_DISCONNECT,
                            "@SERVER",
                            new LobbyEventPayload(userSession.getLobbyId(), userSession.getUsername())
                    )
            ));
        }
    }

    public void delete(Lobby lobby) {
        lobbyRepository.delete(lobby);
        redisClaimService.deleteLobbyJoin(lobby.getId());
        redisClaimService.deleteGameCreation(lobby.getId());
        if(lobby.getType() == LobbyType.QUICK_MATCH){
            quickMatchService.delete(lobby);
        }
    }

    public void removeQuickMatch(Lobby lobby){
        quickMatchService.delete(lobby);
    }

    public Optional<Lobby> popBestQuickMatch(){
        return quickMatchService.popBestQuickMatch();
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

    private boolean isConnectedUser(Lobby lobby, Long userId){
        return userId.equals(lobby.getOpponentId())
                || userId.equals(lobby.getHostId());
    }

    private void cleanupLobby(Lobby lobby) {
        try {
            delete(lobby);
        } catch (RuntimeException cleanupEx) {
            log.warn("Failed to clean up lobby '{}' after failed operation", lobby.getId(), cleanupEx);
        }
    }

    private void restoreLobby(Lobby lobby, Long opponentId, LobbyStatus status) {
        try {
            lobby.setOpponentId(opponentId);
            lobby.setStatus(status);
            lobbyRepository.save(lobby);
        } catch (RuntimeException restoreEx) {
            log.warn("Failed to restore lobby '{}' after failed join", lobby.getId(), restoreEx);
        }
    }

    private void restoreUserSession(UserSession target, UserSession source) {
        target.setState(source.getState());
        target.setGameSessionId(source.getGameSessionId());
        target.setLobbyId(source.getLobbyId());
        target.setSocketSessionId(source.getSocketSessionId());
        target.setTopicSubscriptions(source.getTopicSubscriptions());
    }

}
