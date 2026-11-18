package com.tanks.server.websocket.services;

import com.github.benmanes.caffeine.cache.Cache;
import com.tanks.server.domain.Player;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentSkipListSet;

@Service
@RequiredArgsConstructor
public class QuickMatchService {

    private final ConcurrentSkipListSet<QueueEntry> queue = new ConcurrentSkipListSet<>();
    private final Cache<UUID, Player> pendingPlayerJoinLobbiesCache;

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

    public Optional<UUID> getBestQuickMatchNotInCache() {
        Optional<QueueEntry> entry = queue.stream()
                .filter(queueEntry -> !pendingPlayerJoinLobbiesCache.asMap().containsKey(queueEntry.lobbyId))
                .findFirst();
        return entry.map(queueEntry -> queueEntry.lobbyId);
    }

    public void delete(UUID lobbyId) {
        if (lobbyId != null) {
            queue.removeIf(e -> e.lobbyId.equals(lobbyId));
        }
    }

    public boolean create(UUID lobbyId) {
        if (lobbyId != null) {
            QueueEntry entry = new QueueEntry(lobbyId, Instant.now());
            queue.add(entry);
            return true;
        }
        return false;
    }
}
