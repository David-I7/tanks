package com.tanks.server.websocket.game;

import com.tanks.server.websocket.model.GameState;
import com.tanks.server.websocket.systems.TerrainSystem;

public class Match {
    String id;
    GameState state;

    public Match(String id, GameState state){
        this.id = id;
        this.state = state;
        TerrainSystem.generate(state.terrain());
    }
}
