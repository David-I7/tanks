package com.tanks.server.model;

import java.util.List;

public record GameState(List<Tank> tanks, String currentTurnId,Terrain terrain) {
}
