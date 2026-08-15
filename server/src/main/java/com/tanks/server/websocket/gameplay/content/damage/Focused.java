package com.tanks.server.websocket.gameplay.content.damage;

public record Focused(double radius, double damage) implements DamageEffect {
}
