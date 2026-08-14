package com.tanks.server.websocket.gameplay.world;

import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import java.util.HashMap;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@Builder
@AllArgsConstructor
@NoArgsConstructor
public class DamageTrailState {
    private String id;
    private long ownerPlayerId;
    private OnlineVec2Dto position;
    private double radius;
    private double damagePerSecond;
    private int remainingTicks;
    @Builder.Default
    private Map<Long, Double> damageBuffers = new HashMap<>();

    public DamageTrailState(DamageTrailState other) {
        this.id = other.id;
        this.ownerPlayerId = other.ownerPlayerId;
        this.position = other.position != null ? new OnlineVec2Dto(other.position.x(), other.position.y()) : null;
        this.radius = other.radius;
        this.damagePerSecond = other.damagePerSecond;
        this.remainingTicks = other.remainingTicks;
        this.damageBuffers = other.damageBuffers != null ? new HashMap<>(other.damageBuffers) : new HashMap<>();
    }

    public String id() { return id; }
    public void id(String value) { id = value; }
    public long ownerPlayerId() { return ownerPlayerId; }
    public void ownerPlayerId(long value) { ownerPlayerId = value; }
    public OnlineVec2Dto position() { return position; }
    public void position(OnlineVec2Dto value) { position = value; }
    public double radius() { return radius; }
    public void radius(double value) { radius = value; }
    public double damagePerSecond() { return damagePerSecond; }
    public void damagePerSecond(double value) { damagePerSecond = value; }
    public int remainingTicks() { return remainingTicks; }
    public void remainingTicks(int value) { remainingTicks = value; }
    public Map<Long, Double> damageBuffers() {
        if (damageBuffers == null) damageBuffers = new HashMap<>();
        return damageBuffers;
    }
}
