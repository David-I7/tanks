package com.tanks.server.utils;

import com.tanks.server.model.Projectile;

public class ProjectileFactory {
    static Projectile createProjectile(Projectile.Type type,double x, double y){
        switch (type){
            case REGULAR -> {
                return Projectile.builder()
                        .x(x)
                        .y(y)
                        .type(type)
                        .radius(5)
                        .damage(20)
                        .explosionRadius(50)
                        .build();
            }
        }

        throw new IllegalStateException("Projectile of type '" + type + "' is not supported");
    }
}
