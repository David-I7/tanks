package com.tanks.server.websocket.gameplay.world;

public class WorldMatchState {
    private long activePlayerId;
    private int turnNumber;
    private long turnEndsAtServerTick;
    private Long winnerPlayerId;

    public WorldMatchState(long activePlayerId, int turnNumber, long turnEndsAtServerTick, Long winnerPlayerId) {
        this.activePlayerId = activePlayerId;
        this.turnNumber = turnNumber;
        this.turnEndsAtServerTick = turnEndsAtServerTick;
        this.winnerPlayerId = winnerPlayerId;
    }
    public WorldMatchState(WorldMatchState other) { this(other.activePlayerId, other.turnNumber, other.turnEndsAtServerTick, other.winnerPlayerId); }
    public long activePlayerId() { return activePlayerId; }
    public void activePlayerId(long value) { activePlayerId = value; }
    public int turnNumber() { return turnNumber; }
    public void turnNumber(int value) { turnNumber = value; }
    public long turnEndsAtServerTick() { return turnEndsAtServerTick; }
    public void turnEndsAtServerTick(long value) { turnEndsAtServerTick = value; }
    public Long winnerPlayerId() { return winnerPlayerId; }
    public void winnerPlayerId(Long value) { winnerPlayerId = value; }
}
