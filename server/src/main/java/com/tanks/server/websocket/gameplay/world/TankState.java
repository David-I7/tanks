package com.tanks.server.websocket.gameplay.world;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;

public class TankState {
    private final long entityId;
    private final long playerId;
    private final String displayName;
    private final String definitionId;
    private OnlineVec2Dto position;
    private int facing;
    private double aimAngle = 45;
    private double power = .5;
    private String selectedProjectileSlotId;
    private int health;
    private int fuel;

    public TankState(long entityId, long playerId, String displayName, String definitionId,
            OnlineVec2Dto position, int facing, String selectedProjectileSlotId, int health, int fuel) {
        this.entityId = entityId;
        this.playerId = playerId;
        this.displayName = displayName;
        this.definitionId = definitionId;
        this.position = position;
        this.facing = facing;
        this.selectedProjectileSlotId = selectedProjectileSlotId;
        this.health = health;
        this.fuel = fuel;
    }

    public TankState(TankState other) {
        this(other.entityId, other.playerId, other.displayName, other.definitionId,
                new OnlineVec2Dto(other.position.x(), other.position.y()), other.facing,
                other.selectedProjectileSlotId, other.health, other.fuel);
        aimAngle = other.aimAngle;
        power = other.power;
    }

    public long entityId() { return entityId; }
    public long playerId() { return playerId; }
    public String displayName() { return displayName; }
    public String definitionId() { return definitionId; }
    public OnlineVec2Dto position() { return position; }
    public void position(OnlineVec2Dto value) { position = value; }
    public int facing() { return facing; }
    public void facing(int value) { facing = value; }
    public double aimAngle() { return aimAngle; }
    public void aimAngle(double value) { aimAngle = value; }
    public double power() { return power; }
    public void power(double value) { power = value; }
    public String selectedProjectileSlotId() { return selectedProjectileSlotId; }
    public void selectedProjectileSlotId(String value) { selectedProjectileSlotId = value; }
    public int health() { return health; }
    public void health(int value) { health = Math.max(0, value); }
    public int fuel() { return fuel; }
    public void fuel(int value) { fuel = Math.max(0, value); }
    public boolean alive() { return health > 0; }
}
