package com.tanks.server.websocket.gameplay.content.damage;

public record Radial(double radius, double damage) implements DamageEffect {
}
