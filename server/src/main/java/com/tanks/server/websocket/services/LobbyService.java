package com.tanks.server.websocket.services;

import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.dto.lobby.LobbyEventPayload;
import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;
import com.tanks.server.websocket.dto.lobby.LobbyEventType;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyPlayerConfig;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.events.LobbyEvent;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.AllArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class LobbyService {

    private final LobbyRepository lobbyRepository;
    private final QuickMatchService quickMatchService;
    private final UserSessionService userSessionService;
    private final ApplicationEventPublisher eventPublisher;

    public Lobby create(UserSession userSession, LobbyType type, String tankDefinitionId) {
        UserSession originalUserSession = new UserSession(userSession);
        UUID uuid = IdFactory.randomUUID();
        Lobby lobby = Lobby.builder()
                .host(LobbyPlayerConfig.builder()
                        .id(userSession.getId())
                        .username(userSession.getUsername())
                        .tankDefinitionId(tankDefinitionId)
                        .build())
                .type(type)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .id(uuid)
                .build();

        try {
            lobbyRepository.save(lobby);
            if (lobby.getType() == LobbyType.QUICK_MATCH) {
                quickMatchService.create(lobby);
            }

            userSessionService.transitionToLobby(userSession, uuid);
            userSessionService.save(userSession);

            eventPublisher.publishEvent(new LobbyEvent(this, userSession.getUsername(), "/queue/replies",
                    new LobbyEventResponseDto(LobbyEventType.LOBBY_CREATED, new LobbyEventPayload(uuid, userSession.getId(),userSession.getUsername()))));
        } catch (RuntimeException ex) {
            restoreUserSession(originalUserSession);
            cleanupLobby(lobby);
            throw ex;
        }

        return lobby;
    }

    public void join(UUID lobbyId, UserSession userSession, String tankDefinitionId) {
        Lobby lobby = findById(lobbyId);
        LobbyPlayerConfig originalOpponent= lobby.getOpponent();
        LobbyStatus originalStatus = lobby.getStatus();
        UserSession originalUserSession = new UserSession(userSession);

        if (isFullLobby(lobby)) {
            throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Lobby is full.", URI.create("/lobby/join/private/" + lobbyId));
        }

        try {
            // New user has joined
            lobby.setOpponent(LobbyPlayerConfig.builder()
                    .id(userSession.getId())
                    .username(userSession.getUsername())
                    .tankDefinitionId(tankDefinitionId)
                    .build());
            lobby.setStatus(LobbyStatus.READY);
            lobbyRepository.save(lobby);

            userSessionService.transitionToLobby(userSession, lobbyId);
            userSessionService.save(userSession);

            eventPublisher.publishEvent(new LobbyEvent(this, userSession.getUsername(), "/queue/replies",
                    new LobbyEventResponseDto(LobbyEventType.LOBBY_JOINED, new LobbyEventPayload(lobbyId,lobby.getHost().getId() ,userSession.getUsername()))));
        } catch (RuntimeException ex) {
            restoreUserSession(originalUserSession);
            restoreLobby(lobby, originalOpponent, originalStatus);
            throw ex;
        }
    }

    public void joinQuickMatch(UserSession userSession, String tankDefinitionId) {
        Optional<Lobby> lobbyOpt = popBestQuickMatch();

        if (lobbyOpt.isPresent()) {
            Lobby quickMatchLobby = lobbyOpt.get();
            join(quickMatchLobby.getId(), userSession, tankDefinitionId);
        } else {
            create(userSession, LobbyType.QUICK_MATCH, tankDefinitionId);
        }
    }

    public void removeUser(UserSession userSession) {
        UUID lobbyId = userSession.getLobbyId();
        Lobby lobby = findById(lobbyId);

        if (!isConnectedUser(lobby, userSession.getId()))
            throw new IllegalStateException("The provided user is not connected to the lobby " + lobbyId);

        if (lobby.getOpponent() == null) {
            delete(lobby);
        } else {
            if (lobby.getHost().getId().equals(userSession.getId())) {
                lobby.setHost(lobby.getOpponent());
            }

            lobby.setOpponent(null);
            lobby.setStatus(LobbyStatus.WAITING_FOR_OPPONENT);
            lobbyRepository.save(lobby);

            eventPublisher.publishEvent(new LobbyEvent(this, null,
                    "/topic/lobby/" + userSession.getLobbyId(),
                    new LobbyEventResponseDto(
                            LobbyEventType.LOBBY_DISCONNECT,
                            new LobbyEventPayload(userSession.getLobbyId(), lobby.getHost().getId(),userSession.getUsername())
                    )
            ));
        }
    }

    public void delete(Lobby lobby) {
        lobbyRepository.delete(lobby);
        if (lobby.getType() == LobbyType.QUICK_MATCH) {
            quickMatchService.delete(lobby);
        }
    }

    public Optional<Lobby> popBestQuickMatch() {
        return quickMatchService.popBestQuickMatch();
    }

    public Lobby findById(UUID lobbyId) {
        Lobby lobby = lobbyRepository.findById(lobbyId)
                .orElseThrow(() -> new ProblemDetailException(HttpStatus.NOT_FOUND, "The lobby with the provided id does not exist.", URI.create("about:blank")));

        return lobby;
    }

    private boolean isFullLobby(Lobby lobby) {
        return (lobby.getHost().getId() != null)
                && (lobby.getOpponent().getId() != null);
    }

    private boolean isConnectedUser(Lobby lobby, Long userId) {
        return userId.equals(lobby.getOpponent().getId())
                || userId.equals(lobby.getHost().getId());
    }

    private void cleanupLobby(Lobby lobby) {
        delete(lobby);
    }

    private void restoreLobby(Lobby lobby, LobbyPlayerConfig opponent, LobbyStatus status) {
        lobby.setOpponent(opponent);
        lobby.setStatus(status);
        lobbyRepository.save(lobby);
    }

    private void restoreUserSession(UserSession original) {
        userSessionService.save(original);
    }

}
