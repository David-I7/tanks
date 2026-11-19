package com.tanks.server.websocket.gameplay.content.definitions;

public record ApexSplitConfig(
        int splitCount,
        int totalDamagePool,
        double spreadVelocity) {
}
