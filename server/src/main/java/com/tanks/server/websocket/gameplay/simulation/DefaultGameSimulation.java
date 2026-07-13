package com.tanks.server.websocket.gameplay.simulation;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import com.tanks.server.websocket.dto.gameplay.*;
import com.tanks.server.websocket.gameplay.content.*;
import com.tanks.server.websocket.gameplay.validation.MovementPathValidator;
import com.tanks.server.websocket.gameplay.world.*;

@Service
public class DefaultGameSimulation implements GameSimulation {
    @Override
    public Optional<OnlineDiffResponsePayloads.MovementSegment> move(GameContent content, World world,
            TerrainModel terrain, String intentId, long playerId, OnlinePlayerIntentRequestPayloads.Move request,
            long startedServerTick) {
        if (request.direction() != -1 && request.direction() != 1) return Optional.empty();
        TankState state = world.requireTankByPlayer(playerId);
        TankDefinition tank = content.requireTank(state.definitionId());
        state.facing(request.direction());
        OnlineVec2Dto from = state.position();
        List<OnlineVec2Dto> path = new ArrayList<>();
        path.add(from);
        int fuelBefore = state.fuel();
        int fuelRemaining = fuelBefore;
        int completedColumns = 0;
        double currentX = from.x();
        double currentY = from.y();

        for (int step = 0; step < tank.movementQuantum(); step++) {
            int nextX = (int) Math.round(currentX) + request.direction();
            if (!MovementPathValidator.withinBounds(nextX, tank, content.world().width())) break;
            double nextY = terrain.surfaceY(nextX) - tank.trackGroundOffset();
            if (!MovementPathValidator.canClimb(currentY, nextY, tank)) break;
            boolean ledge = nextY - currentY > tank.climbCapability();
            int cost = (int) Math.ceil(tank.fuelRate()
                    * (ledge ? Math.abs(nextX - currentX) : Math.hypot(nextX - currentX, nextY - currentY)));
            if (cost > fuelRemaining) break;
            fuelRemaining -= cost;
            if (ledge) path.add(new OnlineVec2Dto(nextX, currentY));
            currentX = nextX;
            currentY = nextY;
            path.add(new OnlineVec2Dto(currentX, currentY));
            completedColumns++;
            if (ledge) break;
        }

        if (path.size() == 1) return Optional.empty();
        OnlineVec2Dto to = path.getLast();
        state.position(to);
        state.fuel(fuelRemaining);
        long duration = content.world().movementSegmentDurationTicks();
        return Optional.of(new OnlineDiffResponsePayloads.MovementSegment(intentId, playerId, state.entityId(),
                from, to, List.copyOf(path), fuelBefore, fuelRemaining, fuelBefore - fuelRemaining,
                completedColumns < tank.movementQuantum(), startedServerTick, startedServerTick + duration, duration));
    }

    @Override
    public OnlineDiffResponsePayloads.ProjectileResolution fire(GameContent content, World world, TerrainModel terrain,
            String intentId, long projectileEntityId, long playerId, OnlinePlayerIntentRequestPayloads.Fire request) {
        TankState firing = world.requireTankByPlayer(playerId);
        TankDefinition tank = content.requireTank(firing.definitionId());
        String projectileId = tank.loadout().stream().filter(slot -> slot.id().equals(request.projectileSlotId()))
                .map(ProjectileSlotDefinition::projectileDefinitionId)
                .findFirst().orElseThrow(() -> new IllegalArgumentException("Unknown projectile slot"));
        ProjectileDefinition projectile = content.requireProjectile(projectileId);
        double facing = firing.facing();
        double angle = Math.toRadians(request.angle());
        OnlineVec2Dto launch = new OnlineVec2Dto(
                firing.position().x() + tank.muzzleForwardOffset() * facing,
                firing.position().y() - tank.muzzleVerticalOffset());
        double speed = projectile.baseVelocity() * request.power() * projectile.muzzleVelocityScale();
        double vx = Math.cos(angle) * speed * facing;
        double vy = -Math.sin(angle) * speed;
        List<OnlineVec2Dto> trajectory = new ArrayList<>();
        trajectory.add(launch);
        OnlineVec2Dto impact = launch;
        TankState hit = null;
        for (int step = 0; step < content.world().maxProjectileSteps(); step++) {
            double dt = content.world().projectileTimeStepSeconds();
            impact = new OnlineVec2Dto(round(impact.x() + vx * dt), round(impact.y() + vy * dt));
            vy += content.world().gravity() * projectile.gravityScale() * dt;
            vx *= Math.max(0, 1 - projectile.drag());
            trajectory.add(impact);
            hit = hitTank(world, firing.playerId(), impact, projectile.radius(), content);
            if (hit != null || terrain.intersectsCircle(impact.x(), impact.y(), projectile.radius())
                    || impact.x() < 0 || impact.x() >= terrain.width() || impact.y() >= terrain.height()) break;
        }
        List<OnlineTankDamageResponseDto> damage = new ArrayList<>();
        for (TankState target : world.tanks().values()) {
            if (!target.alive()) continue;
            double distance = Math.hypot(impact.x() - target.position().x(), impact.y() - target.position().y());
            if (distance > projectile.damageEffect().radius()) continue;
            int amount = (int) Math.round(projectile.damageEffect().damage());
            target.health(target.health() - amount);
            damage.add(new OnlineTankDamageResponseDto(target.entityId(), target.playerId(), amount, target.health()));
        }
        return new OnlineDiffResponsePayloads.ProjectileResolution(intentId, projectileEntityId, playerId,
                projectile.id(), projectile.renderAssetId(), projectile.impactRenderAssetId(), launch,
                List.copyOf(trajectory), impact, List.copyOf(damage));
    }

    @Override
    public OnlineDiffResponsePayloads.TerrainPatch deformTerrain(GameContent content, World world,
            TerrainModel terrain, String projectileDefinitionId, OnlineVec2Dto impact) {
        var mutation = terrain.deform(impact.x(), impact.y(), content.requireProjectile(projectileDefinitionId).terrainEffect());
        return new OnlineDiffResponsePayloads.TerrainPatch(List.of(new OnlineTerrainPatchResponseDto.HeightmapRange(
                OnlineTerrainPatchResponseDto.TerrainPatchKind.HEIGHTMAP_RANGE, mutation.startX(), mutation.surface())));
    }

    @Override
    public List<OnlineDiffResponsePayloads.MovementSegment> settleUnsupportedTanks(GameContent content, World world,
            TerrainModel terrain, long startedServerTick) {
        List<OnlineDiffResponsePayloads.MovementSegment> segments = new ArrayList<>();
        for (TankState state : world.tanks().values()) {
            TankDefinition tank = content.requireTank(state.definitionId());
            double supportedY = terrain.surfaceY(state.position().x()) - tank.trackGroundOffset();
            if (state.position().y() < supportedY) {
                OnlineVec2Dto from = state.position();
                OnlineVec2Dto to = new OnlineVec2Dto(from.x(), supportedY);
                state.position(to);
                long duration = content.world().movementSegmentDurationTicks();
                segments.add(new OnlineDiffResponsePayloads.MovementSegment(null, state.playerId(), state.entityId(),
                        from, to, List.of(from, to), state.fuel(), state.fuel(), 0, false,
                        startedServerTick, startedServerTick + duration, duration));
            }
        }
        return List.copyOf(segments);
    }

    private static TankState hitTank(World world, long ownerId, OnlineVec2Dto point, double projectileRadius,
            GameContent content) {
        return world.tanks().values().stream().filter(tank -> tank.playerId() != ownerId && tank.alive())
                .filter(tank -> Math.hypot(point.x() - tank.position().x(), point.y() - tank.position().y())
                        <= projectileRadius + content.requireTank(tank.definitionId()).collisionRadius())
                .findFirst().orElse(null);
    }

    private static double round(double value) { return Math.round(value * 1000d) / 1000d; }
}
