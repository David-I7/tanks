package com.tanks.server.websocket.gameplay.world;

import java.util.ArrayList;
import java.util.List;
import com.tanks.server.websocket.gameplay.content.TerrainEffect;
import com.tanks.server.websocket.gameplay.content.WorldDefinition;

public class TerrainModel {
    private final int width;
    private final int height;
    private final int bedrockY;
    private final ArrayList<Integer> surface;

    public TerrainModel(WorldDefinition definition, List<Integer> surface) {
        this.width = definition.width();
        this.height = definition.height();
        this.bedrockY = definition.bedrockY();
        if (surface.size() != width) throw new IllegalArgumentException("Surface Heightmap must contain one value per X");
        this.surface = new ArrayList<>(width);
        surface.forEach(y -> this.surface.add(clampY(y)));
    }

    public TerrainModel(TerrainModel other) {
        width = other.width;
        height = other.height;
        bedrockY = other.bedrockY;
        surface = new ArrayList<>(other.surface);
    }

    public int width() { return width; }
    public int height() { return height; }
    public int bedrockY() { return bedrockY; }
    public int surfaceY(double x) { return surface.get(Math.max(0, Math.min(width - 1, (int) Math.round(x)))); }
    public List<Integer> surface() { return List.copyOf(surface); }
    public boolean intersectsCircle(double cx, double cy, double radius) {
        int start = Math.max(0, (int) Math.floor(cx - radius));
        int end = Math.min(width - 1, (int) Math.ceil(cx + radius));
        for (int x = start; x <= end; x++) {
            double dx = x - cx;
            double vertical = Math.sqrt(Math.max(0, radius * radius - dx * dx));
            if (cy + vertical >= surface.get(x)) return true;
        }
        return false;
    }

    public SurfaceMutation deform(double cx, double cy, TerrainEffect effect) {
        double radius = effect instanceof TerrainEffect.Crater crater ? crater.radius() : ((TerrainEffect.Drill) effect).radius();
        double depthOffset = effect instanceof TerrainEffect.Drill drill ? drill.depth() : 0;
        int start = Math.max(0, Math.min(width - 1, (int) Math.floor(cx - radius)));
        int end = Math.max(start, Math.min(width - 1, (int) Math.ceil(cx + radius)));
        for (int x = start; x <= end; x++) {
            double dx = x - cx;
            double remaining = radius * radius - dx * dx;
            if (remaining < 0) continue;
            int bottom = (int) Math.floor(cy + depthOffset + Math.sqrt(remaining));
            surface.set(x, clampY(Math.max(surface.get(x), bottom)));
        }
        return new SurfaceMutation(start, List.copyOf(surface.subList(start, end + 1)));
    }

    private int clampY(int y) { return Math.max(0, Math.min(bedrockY, y)); }

    public record SurfaceMutation(int startX, List<Integer> surface) {}
}
