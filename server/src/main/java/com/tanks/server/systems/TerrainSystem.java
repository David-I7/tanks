package com.tanks.server.systems;

import com.tanks.server.model.Projectile;
import com.tanks.server.model.Terrain;

public class TerrainSystem {
    public static void generate(Terrain terrain) {
        var grid = terrain.getGrid();
        int width= terrain.getWidth();
        int height = terrain.getHeight();

        for (int x = 0; x < width; x++) {
            double ySurface = (height * 0.6) + Math.sin(x * 0.01) * 50 + Math.sin(x * 0.03) * 25;

            for (int y = 0; y < height; y++) {
                if (y >= ySurface) {
                    grid[x][y] = true;
                }
            }
        }
    }

    public static void destroy(Terrain terrain, Projectile projectile){
        var grid = terrain.getGrid();
        int width= terrain.getWidth();
        int height = terrain.getHeight();

        double cx = projectile.getX();
        double cy = projectile.getX();
        int radius = projectile.getRadius();
        int explosionRadius = projectile.getExplosionRadius();

        int startX = (int) Math.max(0, cx - radius);
        int endX = (int) Math.min(width - 1, cx + radius);
        int startY = (int) Math.max(0, cy - radius);
        int endY = (int) Math.min(height - 1, cy + radius);

        double radiusSq = radius * radius;

        for (int x = startX; x <= endX; x++) {
            for (int y = startY; y <= endY; y++) {
                double dx = x - cx;
                double dy = y - cy;
                if ((dx * dx) + (dy * dy) <= radiusSq) {
                    grid[x][y] = false;
                }
            }
        }
    }

    public static boolean isTerrainSolid(Terrain terrain, double x, double y) {
        var grid = terrain.getGrid();
        int width= terrain.getWidth();
        int height = terrain.getHeight();

        int ix = (int) Math.floor(x);
        int iy = (int) Math.floor(y);

        if (ix < 0 || ix >= width || iy < 0 || iy >= height) {
            return false;
        }
        return grid[ix][iy];
    }
}
