package com.tanks.server.websocket.services;

import com.tanks.server.websocket.entities.gameSession.GameSession;

import java.util.List;

public class GameBatchTickTask implements Runnable {

    private final List<GameSession> games;
    private final ServerSimulationLoopService simulationLoopService;

    public GameBatchTickTask(List<GameSession> games, ServerSimulationLoopService simulationLoopService) {
        this.games = games;
        this.simulationLoopService = simulationLoopService;
    }

    public List<GameSession> getGames() {
        return games;
    }

    @Override
    public void run() {
        for (GameSession gameSession : games) {
            simulationLoopService.advance(gameSession);
        }
    }
}
