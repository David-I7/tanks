package com.tanks.server.model;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class Projectile {
    private double x;
    private double y;
    private Type type;
    private int radius;
    private int damage;
    private int explosionRadius;

    public enum Type{
        REGULAR
    }
}
