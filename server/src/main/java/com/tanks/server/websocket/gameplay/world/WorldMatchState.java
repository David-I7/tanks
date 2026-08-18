package com.tanks.server.websocket.gameplay.world;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@Builder
@AllArgsConstructor
@NoArgsConstructor
public class WorldMatchState {
    private long activePlayerId;
    private int turnNumber;
    private long turnEndsAtServerTick;
    private Long winnerPlayerId;
    private double wind;
    private String biome;

    public WorldMatchState(WorldMatchState other) {
        this(other.activePlayerId, other.turnNumber, other.turnEndsAtServerTick, other.winnerPlayerId, other.wind, other.biome);
    }
    public long activePlayerId() { return activePlayerId; }
    public void activePlayerId(long value) { activePlayerId = value; }
    public int turnNumber() { return turnNumber; }
    public void turnNumber(int value) { turnNumber = value; }
    public long turnEndsAtServerTick() { return turnEndsAtServerTick; }
    public void turnEndsAtServerTick(long value) { turnEndsAtServerTick = value; }
    public Long winnerPlayerId() { return winnerPlayerId; }
    public void winnerPlayerId(Long value) { winnerPlayerId = value; }
    public double wind() { return wind; }
    public void wind(double value) { wind = value; }
    public String biome() { return biome; }
    public void biome(String value) { biome = value; }
}
