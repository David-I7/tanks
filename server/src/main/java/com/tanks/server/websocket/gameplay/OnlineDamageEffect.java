package com.tanks.server.websocket.gameplay;

public sealed interface OnlineDamageEffect permits OnlineDamageEffect.Radial, OnlineDamageEffect.Focused {

    record Radial(double radius, double damage) implements OnlineDamageEffect {
    }

    record Focused(double radius, double damage) implements OnlineDamageEffect {
    }
}
