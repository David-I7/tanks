package com.tanks.server.model;

public class Terrain {
    private final int width;
    private final int height;

    // true = solid ground, false = empty air
    private final boolean[][] grid;

    public Terrain(int width, int height){
        this.width = width;
        this.height = height;
        this.grid = new boolean[width][height];
    }

    public boolean[][] getGrid() {
        return grid;
    }

    public int getHeight() {
        return height;
    }

    public int getWidth() {
        return width;
    }
}
