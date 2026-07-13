package com.tanks.server.websocket.gameplay.content;

public sealed interface DamageEffect permits DamageEffect.Radial, DamageEffect.Focused {
    double radius();
    double damage();
    record Radial(double radius, double damage) implements DamageEffect {}
    record Focused(double radius, double damage) implements DamageEffect {}
}
