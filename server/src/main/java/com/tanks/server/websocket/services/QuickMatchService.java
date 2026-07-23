package com.tanks.server.websocket.services;

import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.repositories.LobbyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentSkipListSet;

@Service
@RequiredArgsConstructor
public class QuickMatchService {

    private final LobbyRepository lobbyRepository;

    private final ConcurrentSkipListSet<QueueEntry> queue = new ConcurrentSkipListSet<>();
    private final ConcurrentHashMap<UUID, QueueEntry> map = new ConcurrentHashMap<>();

    private record QueueEntry(UUID lobbyId, Instant createdAt) implements Comparable<QueueEntry> {
        @Override
        public int compareTo(QueueEntry other) {
            int cmp = this.createdAt.compareTo(other.createdAt);
            if (cmp != 0) {
                return cmp;
            }
            return this.lobbyId.compareTo(other.lobbyId);
        }
    }

    public Optional<Lobby> popBestQuickMatch() {
        QueueEntry entry;
        while ((entry = queue.pollFirst()) != null) {
            map.remove(entry.lobbyId());
            UUID lobbyId = entry.lobbyId();

            if (lobbyId == null) {
                continue;
            }

            Optional<Lobby> lobby;
            try {
                lobby = lobbyRepository.findById(lobbyId);
            } catch (IllegalArgumentException ex) {
                continue;
            }

            if (lobby.filter(this::isValidWaitingQuickMatchLobby).isPresent()) {
                return lobby;
            }
        }

        return Optional.empty();
    }

    public void delete(Lobby lobby) {
        if (lobby != null && lobby.getId() != null) {
            QueueEntry entry = map.remove(lobby.getId());
            if (entry != null) {
                queue.remove(entry);
            }
        }
    }

    public Lobby create(Lobby lobby) {
        if (lobby != null && lobby.getId() != null) {
            QueueEntry entry = new QueueEntry(lobby.getId(), Instant.now());
            map.put(lobby.getId(), entry);
            queue.add(entry);
        }
        return lobby;
    }

    private boolean isValidWaitingQuickMatchLobby(Lobby lobby) {
        return lobby.getType() == LobbyType.QUICK_MATCH
                && lobby.getStatus() == LobbyStatus.WAITING_FOR_OPPONENT
                && lobby.getHost() != null && lobby.getHost().getId() != null
                && lobby.getOpponent() == null;
    }
}
