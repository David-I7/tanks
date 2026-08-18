package com.tanks.server.websocket.services;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;
import com.tanks.server.websocket.gameplay.world.DamageTrailState;
import com.tanks.server.websocket.gameplay.world.LootCrateState;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.repositories.GameSessionRepository;

public class GameBatchTickTask implements Runnable {

    private final List<GameSession> sessions;
    private final GameSessionService gameSessionService;
    private final GameSessionRepository gameSessionRepository;
    private final GameContentCatalog contentCatalog;

    public GameBatchTickTask(List<GameSession> sessions,
                             GameSessionService gameSessionService,
                             GameSessionRepository gameSessionRepository,
                             GameContentCatalog contentCatalog) {
        this.sessions = sessions;
        this.gameSessionService = gameSessionService;
        this.gameSessionRepository = gameSessionRepository;
        this.contentCatalog = contentCatalog;
    }

    @Override
    public void run() {
        for (GameSession gameSession : sessions) {
            try {
                runTickTask(gameSession);
            } catch (Exception e) {
                // Log and continue to process other sessions in the batch
            }
        }
    }

    public void runTickTask(GameSession gameSession) {
        long nextServerTick = gameSession.getServerTick() + 1;
        gameSession.setServerTick(nextServerTick);

        if (gameSession.getWorld() != null) {
            tickDamageTrails(gameSession);
            tickLootCrates(gameSession);
            checkDamageTrailKills(gameSession);
        }

        if (gameSession.getMatchEndsAtServerTick() > 0 && gameSession.getState() == GameSessionState.STARTED) {
            long remainingTicks = gameSession.getMatchEndsAtServerTick() - nextServerTick;
            var worldDef = contentCatalog.require(gameSession.getGameContentVersion()).world();
            int tickRateHz = worldDef.tickRateHz();
            var schedule = worldDef.lootCrates().spawnScheduleSeconds();
            if (schedule.size() >= 3) {
                if (remainingTicks <= (long) schedule.get(0) * tickRateHz && !gameSession.isCrateSpawnedMinute1()) {
                    gameSession.setCrateSpawnedMinute1(true);
                    gameSessionService.spawnLootCrate(gameSession);
                } else if (remainingTicks <= (long) schedule.get(1) * tickRateHz && !gameSession.isCrateSpawnedMinute2()) {
                    gameSession.setCrateSpawnedMinute2(true);
                    gameSessionService.spawnLootCrate(gameSession);
                } else if (remainingTicks <= (long) schedule.get(2) * tickRateHz && !gameSession.isCrateSpawnedMinute3()) {
                    gameSession.setCrateSpawnedMinute3(true);
                    gameSessionService.spawnLootCrate(gameSession);
                }
            }
        }

        if (gameSession.getPendingTurnTransitionAtServerTick() > 0
                && nextServerTick >= gameSession.getPendingTurnTransitionAtServerTick()) {
            gameSessionService.executePendingTurnTransition(gameSession);
        }

        if (gameSession.getMatchEndsAtServerTick() > 0 && nextServerTick >= gameSession.getMatchEndsAtServerTick()) {
            handleMatchExpiration(gameSession);
            return;
        }

        if (gameSession.getWorld() != null && gameSession.getWorld().match() != null
                && gameSession.getPendingTurnTransitionAtServerTick() <= 0
                && gameSession.getWorld().match().turnEndsAtServerTick() <= nextServerTick) {
            advanceTurnWithoutShot(gameSession);
        }

        gameSessionRepository.save(gameSession);
    }

    private void checkDamageTrailKills(GameSession gameSession) {
        if (gameSession.getWorld() == null || gameSession.getState() != GameSessionState.STARTED) {
            return;
        }
        var tank1 = gameSession.getWorld().requireTankByPlayer(1L);
        var tank2 = gameSession.getWorld().requireTankByPlayer(2L);
        if (!tank1.alive() || !tank2.alive()) {
            gameSessionService.executePendingTurnTransition(gameSession);
        }
    }

    public void tickLootCrates(GameSession gameSession) {
        if (gameSession.getWorld() == null || gameSession.getWorld().lootCrates() == null
                || gameSession.getWorld().lootCrates().isEmpty()) {
            return;
        }
        var worldDef = contentCatalog.require(gameSession.getGameContentVersion()).world();
        int tickRateHz = worldDef.tickRateHz();
        double dropSpeed = worldDef.lootCrates().dropSpeed();
        double collectionRadius = worldDef.lootCrates().collectionRadius();
        var iterator = gameSession.getWorld().lootCrates().iterator();
        while (iterator.hasNext()) {
            LootCrateState crate = iterator.next();
            if (crate.collected()) {
                iterator.remove();
                continue;
            }

            if (crate.isLanding()) {
                double dropSpeedPerTick = dropSpeed / (double) tickRateHz;
                double newY = crate.y() + dropSpeedPerTick;
                if (newY >= crate.targetY()) {
                    crate.y(crate.targetY());
                    crate.isLanding(false);
                } else {
                    crate.y(newY);
                }
            }

            for (TankState tank : gameSession.getWorld().tanks().values()) {
                if (!tank.alive())
                    continue;
                double dist = Math.hypot(tank.position().x() - crate.x(), tank.position().y() - crate.y());
                if (dist <= collectionRadius) {
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
        int maxHp = tankDef.maxHealth();
        int maxFuel = tankDef.maxFuel();
        if ("hp".equalsIgnoreCase(crate.crateType())) {
            tank.health(Math.min(maxHp, tank.health() + val));
        } else if ("fuel".equalsIgnoreCase(crate.crateType())) {
            tank.fuel(Math.min(maxFuel, tank.fuel() + val));
        } else if ("ammo".equalsIgnoreCase(crate.crateType())) {
            List<String> nonInfiniteSlots = tankDef.loadout().stream()
                    .filter(s -> !s.equals(tankDef.loadout().getFirst()))
                    .toList();
            if (!nonInfiniteSlots.isEmpty()) {
                String slot = nonInfiniteSlots.get(new Random().nextInt(nonInfiniteSlots.size()));
                int currentAmmo = tank.weaponAmmo().getOrDefault(slot, 0);
                tank.weaponAmmo().put(slot, currentAmmo + 1);
            }
        }
    }

    public void tickDamageTrails(GameSession gameSession) {
        var world = gameSession.getWorld();
        if (world == null || world.damageTrails() == null || world.damageTrails().isEmpty()) {
            return;
        }

        var content = contentCatalog.require(gameSession.getGameContentVersion());
        int tickRateHz = content.world().tickRateHz();
        var iterator = world.damageTrails().iterator();

        while (iterator.hasNext()) {
            DamageTrailState trail = iterator.next();
            trail.remainingTicks(trail.remainingTicks() - 1);

            double dps = trail.damagePerSecond();
            double damagePerTick = dps / (double) tickRateHz;

            for (TankState tank : world.tanks().values()) {
                if (!tank.alive())
                    continue;

                double dist = Math.hypot(tank.position().x() - trail.position().x(),
                        tank.position().y() - trail.position().y());
                double tankRadius = content.requireTank(tank.definitionId()).collisionRadius();

                if (dist <= trail.radius() + tankRadius) {
                    double accumulated = trail.damageBuffers().getOrDefault(tank.entityId(), 0.0) + damagePerTick;
                    if (accumulated >= 1.0) {
                        int intDamage = (int) Math.floor(accumulated);
                        accumulated -= intDamage;
                        tank.health(Math.max(0, tank.health() - intDamage));
                    }
                    trail.damageBuffers().put(tank.entityId(), accumulated);
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
        if (gameSession.getWorld() == null) {
            return null;
        }
        var tankA = gameSession.getWorld().requireTankByPlayer(1L);
        var tankB = gameSession.getWorld().requireTankByPlayer(2L);
        int healthA = tankA.health();
        int healthB = tankB.health();
        if (healthA > healthB) {
            return 1L;
        } else if (healthB > healthA) {
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
