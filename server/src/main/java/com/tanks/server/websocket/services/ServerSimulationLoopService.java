package com.tanks.server.websocket.services;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.TerminalGame;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.TurnTransition;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationListener;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.dao.DataAccessException;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.enums.*;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class ServerSimulationLoopService implements ApplicationListener<ContextClosedEvent> {

    public static final int TICKS_PER_SECOND = 30;
    public static final int TURN_TIMER_TICKS = TICKS_PER_SECOND * 30;
    public static final int TERMINAL_DELIVERY_GRACE_SECONDS = 5;
    public static final long TICK_RATE_NANOS = 1_000_000_000L / TICKS_PER_SECOND;
    public static final int BATCH_SIZE = 15;

    private final GameSessionRepository gameRepository;
    private final ScheduledExecutorService executorService;
    private final ApplicationEventPublisher eventPublisher;
    private final GameSessionService gameSessionService;
    private final GameContentCatalog contentCatalog;
    private volatile boolean acceptingFrames = true;

    @Autowired
    public ServerSimulationLoopService(
            GameSessionRepository gameRepository,
            ApplicationEventPublisher eventPublisher,
            GameSessionService gameSessionService,
            GameContentCatalog contentCatalog) {
        this.gameRepository = gameRepository;
        this.executorService = createDefaultExecutorService();
        this.eventPublisher = eventPublisher;
        this.gameSessionService = gameSessionService;
        this.contentCatalog = contentCatalog;
    }

    private static ScheduledExecutorService createDefaultExecutorService() {
        int threads = Math.max(4, Runtime.getRuntime().availableProcessors());
        return Executors.newScheduledThreadPool(threads);
    }

    @Scheduled(fixedRate = TICK_RATE_NANOS, timeUnit = TimeUnit.NANOSECONDS)
    public void runSimulationTick() {
        if (!acceptingFrames) {
            return;
        }

        try {
            List<GameSession> activeGames = activeSessions();
            if (activeGames.isEmpty()) {
                return;
            }

            List<List<GameSession>> batches = partition(activeGames, BATCH_SIZE);
            if (executorService == null || executorService.isShutdown()) {
                for (List<GameSession> batch : batches) {
                    new GameBatchTickTask(batch, eventPublisher,gameSessionService,gameRepository,contentCatalog).run();
                }
            } else {
                List<CompletableFuture<Void>> futures = new ArrayList<>();
                for (List<GameSession> batch : batches) {
                    futures.add(CompletableFuture.runAsync(new GameBatchTickTask(batch, eventPublisher,gameSessionService,gameRepository,contentCatalog), executorService));
                }
                CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            }
        } catch (DataAccessException ex) {
            if (acceptingFrames) {
                log.warn("Skipping server simulation tick because active sessions could not be loaded.", ex);
            } else {
                log.debug("Skipping server simulation tick during shutdown.", ex);
            }
        } catch (Exception ex) {
            log.error("Error executing simulation loop tick", ex);
        }
    }

    static <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(new ArrayList<>(list.subList(i, Math.min(i + size, list.size()))));
        }
        return partitions;
    }

    @Scheduled(fixedRate = 5, timeUnit = TimeUnit.SECONDS)
    public void cleanupTerminalSessions() {
        if (!acceptingFrames) {
            return;
        }

        try {
            OffsetDateTime now = OffsetDateTime.now();
            for (GameSession gameSession : terminalSessions()) {
                if (isReadyForCleanup(gameSession, now)) {
                    gameRepository.delete(gameSession);
                }
            }
        } catch (DataAccessException ex) {
            if (acceptingFrames) {
                log.warn("Skipping terminal game cleanup because ended sessions could not be loaded.", ex);
            } else {
                log.debug("Skipping terminal game cleanup during shutdown.", ex);
            }
        }
    }

    @Override
    public void onApplicationEvent(ContextClosedEvent event) {
        acceptingFrames = false;
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
    }

    private List<GameSession> activeSessions() {
        return gameRepository.findByState(GameSessionState.STARTED);
    }

    private List<GameSession> terminalSessions() {
        return gameRepository.findByState(GameSessionState.ENDED);
    }

    private boolean isReadyForCleanup(GameSession gameSession, OffsetDateTime now) {
        return gameSession.getEndedAt() != null
                && !gameSession.getEndedAt().plusSeconds(TERMINAL_DELIVERY_GRACE_SECONDS).isAfter(now);
    }


}
