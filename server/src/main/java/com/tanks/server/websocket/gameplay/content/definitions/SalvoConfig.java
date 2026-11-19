package com.tanks.server.websocket.gameplay.content.definitions;

import java.util.List;

public record SalvoConfig(
        int shotCount,
        double delaySeconds,
        List<Double> gravityScales) {
}
