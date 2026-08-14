package com.tanks.server.websocket.gameplay.world;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LootCrateState {
    private String crateId;
    private String crateType; // "hp", "fuel", "ammo"
    private double x;
    private double y;
    private double targetY;
    private boolean isLanding;
    private boolean collected;
    private Integer value;

    public LootCrateState(LootCrateState other) {
        this.crateId = other.crateId;
        this.crateType = other.crateType;
        this.x = other.x;
        this.y = other.y;
        this.targetY = other.targetY;
        this.isLanding = other.isLanding;
        this.collected = other.collected;
        this.value = other.value;
    }

    public String crateId() { return crateId; }
    public void crateId(String value) { crateId = value; }
    public String crateType() { return crateType; }
    public void crateType(String value) { crateType = value; }
    public double x() { return x; }
    public void x(double value) { x = value; }
    public double y() { return y; }
    public void y(double value) { y = value; }
    public double targetY() { return targetY; }
    public void targetY(double value) { targetY = value; }
    public boolean isLanding() { return isLanding; }
    public void isLanding(boolean value) { isLanding = value; }
    public boolean collected() { return collected; }
    public void collected(boolean value) { collected = value; }
    public Integer value() { return value; }
    public void value(Integer value) { this.value = value; }
}
