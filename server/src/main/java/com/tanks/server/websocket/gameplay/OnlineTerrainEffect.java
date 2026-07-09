package com.tanks.server.websocket.gameplay;

public sealed interface OnlineTerrainEffect permits OnlineTerrainEffect.Crater, OnlineTerrainEffect.Drill {

    record Crater(double radius) implements OnlineTerrainEffect {
    }

    record Drill(double radius, double depth) implements OnlineTerrainEffect {
    }
}
