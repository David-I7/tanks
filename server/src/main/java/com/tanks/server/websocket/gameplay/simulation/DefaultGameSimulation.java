package com.tanks.server.websocket.gameplay.simulation;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import com.tanks.server.websocket.dto.gameplay.*;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponsePayloads.ProjectileResolution;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffResponsePayloads.TerrainPatch;
import com.tanks.server.websocket.dto.gameplay.OnlinePlayerIntentRequestPayloads.Fire;
import com.tanks.server.websocket.gameplay.content.*;
import com.tanks.server.websocket.gameplay.validation.MovementPathValidator;
import com.tanks.server.websocket.gameplay.world.*;

@Service
public class DefaultGameSimulation implements GameSimulation {
    @Override
    public Optional<OnlineDiffResponsePayloads.MovementSegment> move(GameContent content, World world,
            TerrainModel terrain, String intentId, long playerId, OnlinePlayerIntentRequestPayloads.Move request,
            long startedServerTick) {
        if (request.direction() != -1 && request.direction() != 1)
            return Optional.empty();
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
            if (!MovementPathValidator.withinBounds(nextX, tank, content.world().width()))
                break;
            double nextY = terrain.surfaceY(nextX) - tank.trackGroundOffset();
            if (!MovementPathValidator.canClimb(currentY, nextY, tank))
                break;
            boolean ledge = nextY - currentY > tank.climbCapability();
            int cost = (int) Math.ceil(tank.fuelRate()
                    * (ledge ? Math.abs(nextX - currentX) : Math.hypot(nextX - currentX, nextY - currentY)));
            if (cost > fuelRemaining)
                break;
            fuelRemaining -= cost;
            if (ledge)
                path.add(new OnlineVec2Dto(nextX, currentY));
            currentX = nextX;
            currentY = nextY;
            path.add(new OnlineVec2Dto(currentX, currentY));
            completedColumns++;
            if (ledge)
                break;
        }

        if (path.size() == 1)
            return Optional.empty();
        OnlineVec2Dto to = path.getLast();
        state.position(to);
        state.fuel(fuelRemaining);
        long duration = content.world().movementSegmentDurationTicks();
        return Optional.of(new OnlineDiffResponsePayloads.MovementSegment(intentId, playerId, state.entityId(),
                from, to, List.copyOf(path), fuelBefore, fuelRemaining, fuelBefore - fuelRemaining,
                completedColumns < tank.movementQuantum(), startedServerTick, startedServerTick + duration, duration));
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

    private static Optional<TankState> hitTank(World world, long ownerId, OnlineVec2Dto point, double projectileRadius,
            GameContent content) {
        return world.tanks().values().stream().filter(tank -> tank.playerId() != ownerId && tank.alive())
                .filter(tank -> Math.hypot(point.x() - tank.position().x(),
                        point.y() - tank.position().y()) <= projectileRadius
                                + content.requireTank(tank.definitionId()).collisionRadius())
                .findFirst();
    }

    private static double round(double value) {
        return Math.round(value * 1000d) / 1000d;
    }

    @Override
    public ProjectileResolution fire(GameContent content, World world, TerrainModel terrain, String intentId,
            long projectileEntityId, long playerId, Fire request) {
        TankState state = world.requireTankByPlayer(playerId);
        TankDefinition tankDef = content.requireTank(state.definitionId());
        
        String slotId = request.projectileSlotId();
        var slotDef = tankDef.loadout().stream()
                .filter(s -> s.id().equals(slotId))
                .findFirst()
                .orElse(tankDef.loadout().getFirst());
        
        ProjectileDefinition projectileDef = content.requireProjectile(slotDef.projectileDefinitionId());

        double launchX = state.position().x() + (state.facing() * tankDef.muzzleForwardOffset());
        double launchY = state.position().y() - tankDef.muzzleVerticalOffset();
        OnlineVec2Dto launch = new OnlineVec2Dto(round(launchX), round(launchY));

        double speed = request.power() * projectileDef.physics().muzzleVelocityScale();
        double vx = speed * Math.cos(request.angle());
        double vy = speed * Math.sin(request.angle());
        double g = content.world().gravity() * projectileDef.physics().gravityScale();
        double dt = content.world().projectileTimeStepSeconds();

        List<OnlineVec2Dto> trajectory = new ArrayList<>();
        trajectory.add(launch);

        double currX = launchX;
        double currY = launchY;
        double currVx = vx;
        double currVy = vy;

        TankState hitTankState = null;
        OnlineVec2Dto impact = launch;

        for (int step = 0; step < content.world().maxProjectileSteps(); step++) {
            currX += currVx * dt;
            currY += currVy * dt;
            currVy += g * dt;

            if (projectileDef.physics().drag() > 0) {
                currVx *= (1 - projectileDef.physics().drag() * dt);
                currVy *= (1 - projectileDef.physics().drag() * dt);
            }

            impact = new OnlineVec2Dto(round(currX), round(currY));
            trajectory.add(impact);

            if (currX < 0 || currX >= content.world().width() || currY > content.world().height()) {
                break;
            }

            var tankHit = hitTank(world, playerId, impact, projectileDef.physics().radius(), content);
            if (tankHit.isPresent()) {
                hitTankState = tankHit.get();
                break;
            }

            if (terrain.intersectsCircle(currX, currY, projectileDef.physics().radius())) {
                break;
            }
        }

        List<OnlineTankDamageResponseDto> damagedTanks = new ArrayList<>();
        if (hitTankState != null) {
            int damage = 50;
            if (projectileDef.damageEffect() instanceof DamageEffect.Radial radial) {
                damage = (int) Math.round(radial.damage());
            } else if (projectileDef.damageEffect() instanceof DamageEffect.Focused focused) {
                damage = (int) Math.round(focused.damage());
            }
            int healthBefore = hitTankState.health();
            int healthAfter = Math.max(0, healthBefore - damage);
            hitTankState.health(healthAfter);
            damagedTanks.add(new OnlineTankDamageResponseDto(
                    hitTankState.playerId(),
                    hitTankState.entityId(),
                    healthBefore,
                    healthAfter,
                    damage,
                    healthAfter == 0));
        }

        return new ProjectileResolution(
                intentId,
                projectileEntityId,
                playerId,
                projectileDef.id(),
                projectileDef.renderAssetId(),
                projectileDef.impactRenderAssetId(),
                launch,
                List.copyOf(trajectory),
                impact,
                List.copyOf(damagedTanks));
    }

    @Override
    public TerrainPatch deformTerrain(GameContent content, World world, TerrainModel terrain,
            String projectileDefinitionId, OnlineVec2Dto impact) {
        ProjectileDefinition projectileDef = content.requireProjectile(projectileDefinitionId);
        var mutation = terrain.deform(impact.x(), impact.y(), projectileDef.terrainEffect());
        List<OnlineTerrainPatchResponseDto> patches = List.of(
                new OnlineTerrainPatchResponseDto(mutation.startX(), mutation.surface()));
        return new TerrainPatch(patches);
    }
}
