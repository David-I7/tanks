package com.tanks.server.game;

import com.tanks.server.model.GameState;
import com.tanks.server.systems.TerrainSystem;

public class Match {
    String id;
    GameState state;

    public Match(String id, GameState state){
        this.id = id;
        this.state = state;
        TerrainSystem.generate(state.terrain());
    }
}
