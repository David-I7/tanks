package com.tanks.server.websocket.services;

import com.tanks.server.repositories.GameSessionRepository;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.world.DamageTrailState;
import com.tanks.server.websocket.gameplay.world.LootCrateState;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.gameplay.world.World;
import lombok.extern.slf4j.Slf4j;

import java.util.List;

import static com.tanks.server.websocket.services.ServerSimulationLoopService.TICKS_PER_SECOND;

@Slf4j
public class GameBatchTickTask implements Runnable {

    private final List<GameSession> games;
    private final GameSessionService gameSessionService;
    private final GameContentCatalog contentCatalog;
    private final GameSessionRepository gameSessionRepository;

    public GameBatchTickTask(
            List<GameSession> games,
            GameSessionService gameSessionService,
            GameSessionRepository gameSessionRepository,
            GameContentCatalog contentCatalog) {
        this.games = games;
        this.gameSessionService = gameSessionService;
        this.gameSessionRepository = gameSessionRepository;
        this.contentCatalog = contentCatalog;
    }

    @Override
    public void run() {
        for (GameSession gameSession : games) {
            try {
                advance(gameSession);
            } catch (Exception e) {
                log.error("Failed to advance game session {}", gameSession.getId(), e);
                gameSessionRepository.delete(gameSession);
            }
        }
    }

    void advance(GameSession gameSession) {
        long nextServerTick = gameSession.getServerTick() + 1;
        gameSession.setServerTick(nextServerTick);

        if (gameSession.getWorld() != null) {
            tickDamageTrails(gameSession.getWorld());
            tickLootCrates(gameSession);
            checkDamageTrailKills(gameSession);
        }

        if (gameSession.getState() == GameSessionState.ENDED) {
            gameSessionRepository.save(gameSession);
            return;
        }

        if (gameSession.getMatchEndsAtServerTick() > 0 && nextServerTick >= gameSession.getMatchEndsAtServerTick()) {
            handleMatchExpiration(gameSession);
            gameSessionRepository.save(gameSession);
            return;
        }

        if (gameSession.getWorld() != null && gameSession.getWorld().match() != null
                && gameSession.getWorld().match().turnEndsAtServerTick() <= nextServerTick) {
            advanceTurnWithoutShot(gameSession);
        }

        gameSessionRepository.save(gameSession);
    }

    private void checkDamageTrailKills(GameSession gameSession) {
        if (gameSession == null || gameSession.getWorld() == null || gameSession.getState() != GameSessionState.STARTED) {
            return;
        }
        TankState tank1 = gameSession.getWorld().requireTankByPlayer(1L);
        TankState tank2 = gameSession.getWorld().requireTankByPlayer(2L);
        if (!tank1.alive() || !tank2.alive()) {
            gameSessionService.finalizeDamageTrailKills(gameSession);
        }
    }

    public void tickLootCrates(GameSession gameSession) {
        if (gameSession == null || gameSession.getWorld() == null || gameSession.getWorld().lootCrates() == null || gameSession.getWorld().lootCrates().isEmpty()) {
            return;
        }
        var iterator = gameSession.getWorld().lootCrates().iterator();
        while (iterator.hasNext()) {
            LootCrateState crate = iterator.next();
            if (crate.collected()) {
                iterator.remove();
                continue;
            }

            if (crate.isLanding()) {
                double dropSpeedPerTick = 150.0 / (double) TICKS_PER_SECOND;
                double newY = crate.y() + dropSpeedPerTick;
                if (newY >= crate.targetY()) {
                    crate.y(crate.targetY());
                    crate.isLanding(false);
                } else {
                    crate.y(newY);
                }
            }

            for (TankState tank : gameSession.getWorld().tanks().values()) {
                if (!tank.alive()) continue;
                double dist = Math.hypot(tank.position().x() - crate.x(), tank.position().y() - crate.y());
                if (dist <= 35.0) {
                    applyCrateRefill(tank, crate, gameSession);
                    crate.collected(true);
                    iterator.remove();
                    break;
                }
            }
        }
    }

    private void applyCrateRefill(TankState tank, LootCrateState crate, GameSession session) {
        int val = crate.value();
        var content = contentCatalog.require(session.getGameContentVersion());
        var tankDef = content.requireTank(tank.definitionId());
        if ("hp".equalsIgnoreCase(crate.crateType())) {
            tank.health(Math.min(tankDef.maxHealth(), tank.health() + val));
        } else if ("fuel".equalsIgnoreCase(crate.crateType()) || "ammo".equalsIgnoreCase(crate.crateType())) {
            tank.fuel(Math.min(tankDef.maxFuel(), tank.fuel() + val));
        }
    }

    public void tickDamageTrails(World world) {
        if (world == null || world.damageTrails() == null || world.damageTrails().isEmpty()) {
            return;
        }
        var iterator = world.damageTrails().iterator();
        while (iterator.hasNext()) {
            DamageTrailState trail = iterator.next();
            trail.remainingTicks(trail.remainingTicks() - 1);

            double dpsPerTick = trail.damagePerSecond() / (double) TICKS_PER_SECOND;

            for (TankState tank : world.tanks().values()) {
                if (!tank.alive()) continue;
                double dist = Math.hypot(tank.position().x() - trail.position().x(), tank.position().y() - trail.position().y());
                if (dist <= trail.radius()) {
                    double currentBuffer = trail.damageBuffers().getOrDefault(tank.entityId(), 0.0) + dpsPerTick;
                    if (currentBuffer >= 1.0) {
                        int damageToApply = (int) Math.floor(currentBuffer);
                        tank.health(tank.health() - damageToApply);
                        currentBuffer -= damageToApply;
                    }
                    trail.damageBuffers().put(tank.entityId(), currentBuffer);
                }
            }

            if (trail.remainingTicks() <= 0) {
                iterator.remove();
            }
        }
    }

    private void handleMatchExpiration(GameSession gameSession) {
        Long winnerPlayerId = evaluateWinnerOnExpiration(gameSession);
        gameSessionService.finalizeMatchTimeExpired(gameSession, winnerPlayerId);
    }

    private Long evaluateWinnerOnExpiration(GameSession gameSession) {
        TankState tankA = gameSession.getWorld().requireTankByPlayer(1L);
        TankState tankB = gameSession.getWorld().requireTankByPlayer(2L);
        int healthA = tankA.health();
        int healthB = tankB.health();
        if (healthA > healthB) {
            return 1L;
        }
        if (healthB > healthA) {
            return 2L;
        }
        return null;
    }

    private void advanceTurnWithoutShot(GameSession gameSession) {
        long previousPlayerId = gameSession.getWorld().match().activePlayerId();
        long activePlayerId = previousPlayerId == 1 ? 2 : 1;
        gameSessionService.publishTurnStartBatch(gameSession, previousPlayerId, activePlayerId);
    }
}
