package com.tanks.server.model;

import java.util.List;

public record GameState(List<Player> players, String currentTurnId, Terrain terrain) {
}
