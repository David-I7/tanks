package com.tanks.server.websocket.gameplay.content;

public sealed interface TerrainEffect permits TerrainEffect.Crater, TerrainEffect.Drill {
    record Crater(double radius) implements TerrainEffect {}
    record Drill(double radius, double depth) implements TerrainEffect {}
}
