package com.tanks.server.websocket.services;

import com.github.benmanes.caffeine.cache.Cache;
import com.tanks.server.domain.Lobby;
import com.tanks.server.domain.LobbyState;
import com.tanks.server.domain.LobbyType;
import com.tanks.server.domain.Player;
import com.tanks.server.dto.response.LobbyActionResponseDto;
import com.tanks.server.repositories.LobbyRepository;
import com.tanks.server.websocket.dto.lobby.LobbyEventPayload;
import com.tanks.server.websocket.dto.lobby.LobbyEventResponseDto;
import com.tanks.server.websocket.dto.lobby.LobbyEventType;
import com.tanks.server.websocket.events.LobbyEvent;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
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

    private static final String TOPIC_LOBBY_PREFIX = "/topic/lobby/";

    private final LobbyRepository lobbyRepository;
    private final QuickMatchService quickMatchService;
    private final ApplicationEventPublisher eventPublisher;
    private final Cache<UUID, Lobby> pendingLobbiesCache;
    private final Cache<UUID, Player> pendingPlayerJoinLobbiesCache;
    private final Object joinPrivateLobbyLock = new Object();
    private final Object joinPublicLobbyLock = new Object();

    public LobbyActionResponseDto createPendingLobby(String nickname, String tankDefinitionId, LobbyType type) {
        UUID lobbyId = UUID.randomUUID();
        UUID playerId = UUID.randomUUID();

        Player host = new Player(playerId, nickname, tankDefinitionId);
        Lobby lobby = Lobby.builder()
                .id(lobbyId)
                .type(type)
                .state(LobbyState.CREATED)
                .host(host)
                .build();

        pendingLobbiesCache.put(lobbyId, lobby);
        log.info("Created pending {} lobby {} for host {} ({})", type, lobbyId, nickname, playerId);

        return new LobbyActionResponseDto(lobbyId, playerId);
    }

    public LobbyActionResponseDto join(UUID lobbyId, String nickname, String tankDefinitionId) {
        synchronized (joinPrivateLobbyLock) {
            Lobby lobby = findById(lobbyId);

            if (lobby.isFull() || lobby.getState() != LobbyState.WAITING_FOR_PLAYERS) {
                throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "Lobby is full or not accepting players.", URI.create("/api/v1/lobbies/" + lobbyId + "/join"));
            }

            Player joiningPlayer = pendingPlayerJoinLobbiesCache.getIfPresent(lobbyId);
            if (joiningPlayer != null) {
                throw new ProblemDetailException(HttpStatus.CONFLICT, "Another player is currently joining this lobby.", URI.create("/api/v1/lobbies/" + lobbyId + "/join"));
            }

            UUID playerId = UUID.randomUUID();
            Player opponent = new Player(playerId, nickname, tankDefinitionId);
            pendingPlayerJoinLobbiesCache.put(lobbyId, opponent);

            log.info("Player {} ({}) is joining lobby {}", nickname, playerId, lobbyId);
            return new LobbyActionResponseDto(lobbyId, playerId);
        }
    }

    public LobbyActionResponseDto joinQuickMatch(String nickname, String tankDefinitionId) {
        synchronized (joinPublicLobbyLock) {
            Optional<UUID> lobbyId = quickMatchService.getBestQuickMatchNotInCache();

            if (lobbyId.isPresent()) {
                UUID playerId = UUID.randomUUID();
                Player opponent = new Player(playerId, nickname, tankDefinitionId);
                pendingPlayerJoinLobbiesCache.put(lobbyId.get(), opponent);

                log.info("Player {} ({}) quick-matched into lobby {}", nickname, playerId, lobbyId.get());
                return new LobbyActionResponseDto(lobbyId.get(), playerId);
            }

            return createPendingLobby(nickname, tankDefinitionId, LobbyType.PUBLIC);
        }
    }

    public Lobby confirmLobbyCreation(UUID lobbyId, UUID playerId) {
        Lobby pendingLobby = pendingLobbiesCache.getIfPresent(lobbyId);
        if (pendingLobby != null && pendingLobby.getHost() != null && pendingLobby.getHost().id().equals(playerId)) {
            pendingLobbiesCache.invalidate(lobbyId);
            pendingLobby.setState(LobbyState.WAITING_FOR_PLAYERS);
            lobbyRepository.save(pendingLobby);

            if (pendingLobby.getType() == LobbyType.PUBLIC) {
                quickMatchService.create(pendingLobby.getId());
            }

            log.info("Confirmed lobby creation for {}", lobbyId);
            return pendingLobby;
        }

        throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "This lobby does not exist.");
    }

    public Lobby confirmPlayerJoin(UUID lobbyId, UUID playerId) {
        Player pendingPlayer = pendingPlayerJoinLobbiesCache.getIfPresent(lobbyId);
        if (pendingPlayer != null && pendingPlayer.id().equals(playerId)) {
            pendingPlayerJoinLobbiesCache.invalidate(lobbyId);

            Lobby lobby = findById(lobbyId);
            lobby.setOpponent(pendingPlayer);
            lobby.setState(LobbyState.READY_TO_START);
            lobbyRepository.save(lobby);

            if (lobby.getType() == LobbyType.PUBLIC) {
                quickMatchService.delete(lobbyId);
            }

            log.info("Confirmed player join for {}", lobbyId);
            return lobby;
        }
        throw new ProblemDetailException(HttpStatus.BAD_REQUEST, "This player is not pending in the specified lobby.");
    }

    public Optional<Lobby> findActiveOrPendingLobby(UUID lobbyId) {
        Optional<Lobby> active = lobbyRepository.findById(lobbyId);
        if (active.isPresent()) {
            return active;
        }
        return Optional.ofNullable(pendingLobbiesCache.getIfPresent(lobbyId));
    }


    public Lobby findById(UUID lobbyId) {
        return lobbyRepository.findById(lobbyId)
                .orElseThrow(() -> new ProblemDetailException(
                        HttpStatus.NOT_FOUND,
                        "The lobby with the provided id does not exist.",
                        URI.create("/api/v1/lobbies/" + lobbyId)));
    }

    public void removePlayer(UUID lobbyId, UUID playerId) {
        synchronized (this) {
            Optional<Lobby> lobbyOpt = lobbyRepository.findById(lobbyId);
            if (lobbyOpt.isEmpty()) {
                return;
            }

            Lobby lobby = lobbyOpt.get();
            if (!lobby.hasPlayer(playerId)) {
                return;
            }

            Player opponent = lobby.getOpponent();
            Player host = lobby.getHost();

            if (lobby.getState() == LobbyState.IN_GAME) {
                eventPublisher.publishEvent(new LobbyEvent(
                        this,
                        null,
                        TOPIC_LOBBY_PREFIX + lobbyId,
                        new LobbyEventResponseDto(
                                LobbyEventType.LOBBY_DISCONNECT,
                                new LobbyEventPayload(lobbyId, host != null ? host.id() : playerId, playerId)
                        )
                ));
                log.info("Player {} disconnected from active in-game lobby {}", playerId, lobbyId);
                return;
            }

            if (opponent == null) {
                delete(lobby);
                log.info("Lobby {} deleted after sole player {} left", lobbyId, playerId);
                return;
            }

            String disconnectedNickname = host.id().equals(playerId) ? host.nickname() : opponent.nickname();

            if (host.id().equals(playerId)) {
                lobby.setHost(opponent);
                lobby.setOpponent(null);
            } else {
                lobby.setOpponent(null);
            }

            lobby.setState(LobbyState.WAITING_FOR_PLAYERS);
            lobbyRepository.save(lobby);

            if (lobby.getType() == LobbyType.PUBLIC) {
                quickMatchService.create(lobby.getId());
            }

            eventPublisher.publishEvent(new LobbyEvent(
                    this,
                    null,
                    TOPIC_LOBBY_PREFIX + lobbyId,
                    new LobbyEventResponseDto(
                            LobbyEventType.LOBBY_DISCONNECT,
                            new LobbyEventPayload(lobbyId, lobby.getHost().id(), playerId)
                    )
            ));

            log.info("Player {} left lobby {}. New host is {}", disconnectedNickname, lobbyId, lobby.getHost().nickname());
        }
    }

    public void delete(Lobby lobby) {
        lobbyRepository.delete(lobby);
        pendingLobbiesCache.invalidate(lobby.getId());
        pendingPlayerJoinLobbiesCache.invalidate(lobby.getId());
        if (lobby.getType() == LobbyType.PUBLIC) {
            quickMatchService.delete(lobby.getId());
        }
    }
}
