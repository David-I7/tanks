package com.tanks.server.websocket.gameplay.world;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Builder
@NoArgsConstructor
public class TankState {
    private long entityId;
    private long playerId;
    private String displayName;
    private String definitionId;
    private OnlineVec2Dto position;
    private int facing;
    private double aimAngle;
    private double power;
    private String selectedProjectileSlotId;
    private int health;
    private int fuel;
    private Map<String, Integer> weaponAmmo;

    public TankState(long entityId, long playerId, String displayName, String definitionId,
            OnlineVec2Dto position, int facing, double aimAngle, double power,
            String selectedProjectileSlotId, int health, int fuel,
            Map<String, Integer> weaponAmmo) {
        this.entityId = entityId;
        this.playerId = playerId;
        this.displayName = displayName;
        this.definitionId = definitionId;
        this.position = Objects.requireNonNull(position, "position is required");
        this.facing = facing;
        this.aimAngle = aimAngle;
        this.power = power;
        this.selectedProjectileSlotId = Objects.requireNonNull(selectedProjectileSlotId, "selectedProjectileSlotId is required");
        this.health = health;
        this.fuel = fuel;
        this.weaponAmmo = new HashMap<>(Objects.requireNonNull(weaponAmmo, "weaponAmmo is required"));
    }

    public TankState(TankState other) {
        this(other.entityId, other.playerId, other.displayName, other.definitionId,
                new OnlineVec2Dto(other.position.x(), other.position.y()), other.facing,
                other.aimAngle, other.power,
                other.selectedProjectileSlotId, other.health, other.fuel,
                other.weaponAmmo);
    }

    public long entityId() { return entityId; }
    public long playerId() { return playerId; }
    public String displayName() { return displayName; }
    public String definitionId() { return definitionId; }
    public OnlineVec2Dto position() { return position; }
    public void position(OnlineVec2Dto value) { position = Objects.requireNonNull(value, "position is required"); }
    public int facing() { return facing; }
    public void facing(int value) { facing = value; }
    public double aimAngle() { return aimAngle; }
    public void aimAngle(double value) { aimAngle = value; }
    public double power() { return power; }
    public void power(double value) { power = value; }
    public String selectedProjectileSlotId() { return selectedProjectileSlotId; }
    public void selectedProjectileSlotId(String value) { selectedProjectileSlotId = Objects.requireNonNull(value, "selectedProjectileSlotId is required"); }
    public int health() { return health; }
    public void health(int value) { health = Math.max(0, value); }
    public int fuel() { return fuel; }
    public void fuel(int value) { fuel = Math.max(0, value); }
    public Map<String, Integer> weaponAmmo() { return weaponAmmo; }
    public void weaponAmmo(Map<String, Integer> value) {
        this.weaponAmmo = new HashMap<>(Objects.requireNonNull(value, "weaponAmmo is required"));
    }
    public boolean alive() { return health > 0; }
}
