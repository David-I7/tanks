package com.tanks.server.websocket.gameplay.simulation;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import com.tanks.server.websocket.dto.gameplay.OnlineVec2Dto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.MovementSegment;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.ProjectileResolution;
import com.tanks.server.websocket.dto.gameplay.diffResponse.payloads.TerrainPatch;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.MoveIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.snapshots.OnlineTankDamageResponseDto;
import com.tanks.server.websocket.dto.gameplay.terrain.patch.HeightmapRange;
import com.tanks.server.websocket.dto.gameplay.terrain.patch.OnlineTerrainPatchResponseDto;
import com.tanks.server.websocket.dto.gameplay.terrain.patch.TerrainPatchKind;
import com.tanks.server.websocket.gameplay.content.GameContent;
import com.tanks.server.websocket.gameplay.content.damage.Focused;
import com.tanks.server.websocket.gameplay.content.damage.Radial;
import com.tanks.server.websocket.gameplay.content.definitions.ProjectileDefinition;
import com.tanks.server.websocket.gameplay.content.definitions.TankDefinition;
import com.tanks.server.websocket.gameplay.validation.MovementPathValidator;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.gameplay.world.TerrainModel;
import com.tanks.server.websocket.gameplay.world.World;

import com.tanks.server.websocket.dto.gameplay.diffResponse.SubMunitionTrajectoryDto;
import com.tanks.server.websocket.gameplay.content.definitions.DamageTrailConfig;
import com.tanks.server.websocket.gameplay.content.definitions.SubMunitionConfig;
import com.tanks.server.websocket.gameplay.world.DamageTrailState;
import java.util.UUID;

@Service
public class DefaultGameSimulation implements GameSimulation {
    @Override
    public Optional<MovementSegment> move(
            GameContent content,
            World world,
            TerrainModel terrain,
            String intentId,
            long playerId,
            MoveIntentRequestPayload request,
            long startedServerTick
    ) {
        if (request.getDirection() != -1 && request.getDirection() != 1)
            return Optional.empty();
        TankState state = world.requireTankByPlayer(playerId);
        TankDefinition tank = content.requireTank(state.definitionId());
        state.facing(request.getDirection());
        OnlineVec2Dto from = state.position();
        List<OnlineVec2Dto> path = new ArrayList<>();
        path.add(from);
        int fuelBefore = state.fuel();
        int fuelRemaining = fuelBefore;
        int completedColumns = 0;
        double currentX = from.x();
        double currentY = from.y();

        for (int step = 0; step < tank.movementQuantum(); step++) {
            int nextX = (int) Math.round(currentX) + request.getDirection();
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
            checkLootCratePickup(world, content, state, tank, currentX, currentY);
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
        return Optional.of(MovementSegment.builder()
                .playerId(playerId)
                .tankEntityId(state.entityId())
                .from(from)
                .to(to)
                .movementPath(List.copyOf(path))
                .fuelBefore(fuelBefore)
                .fuelAfter(fuelRemaining)
                .fuelSpent(fuelBefore - fuelRemaining)
                .partial(completedColumns < tank.movementQuantum())
                .startedServerTick(startedServerTick)
                .endedServerTick(startedServerTick + duration)
                .durationTicks(duration)
                .build());
    }

    @Override
    public List<MovementSegment> settleUnsupportedTanks(GameContent content, World world,
            TerrainModel terrain, long startedServerTick) {
        List<MovementSegment> segments = new ArrayList<>();
        for (TankState state : world.tanks().values()) {
            TankDefinition tank = content.requireTank(state.definitionId());
            double supportedY = terrain.surfaceY(state.position().x()) - tank.trackGroundOffset();
            if (state.position().y() < supportedY) {
                OnlineVec2Dto from = state.position();
                OnlineVec2Dto to = new OnlineVec2Dto(from.x(), supportedY);
                state.position(to);
                long duration = content.world().movementSegmentDurationTicks();
                segments.add(MovementSegment.builder()
                        .playerId(state.playerId())
                        .tankEntityId(state.entityId())
                        .from(from)
                        .to(to)
                        .movementPath(List.of(from, to))
                        .fuelBefore(state.fuel())
                        .fuelAfter(state.fuel())
                        .fuelSpent(0)
                        .partial(false)
                        .startedServerTick(startedServerTick)
                        .endedServerTick(startedServerTick + duration)
                        .durationTicks(duration)
                        .build());
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

    public static void checkLootCratePickup(World world, GameContent content, TankState tankState, TankDefinition tankDef, double x, double y) {
        if (world == null || world.lootCrates() == null || world.lootCrates().isEmpty()) return;
        var iterator = world.lootCrates().iterator();
        while (iterator.hasNext()) {
            com.tanks.server.websocket.gameplay.world.LootCrateState crate = iterator.next();
            if (crate.collected()) {
                iterator.remove();
                continue;
            }
            double dist = Math.hypot(x - crate.x(), y - crate.y());
            if (dist <= 35.0) {
                int val = crate.value() != null ? crate.value() : 25;
                if ("hp".equalsIgnoreCase(crate.crateType())) {
                    tankState.health(Math.min(tankDef.maxHealth(), tankState.health() + val));
                } else if ("fuel".equalsIgnoreCase(crate.crateType())) {
                    tankState.fuel(Math.min(tankDef.maxFuel(), tankState.fuel() + val));
                } else if ("ammo".equalsIgnoreCase(crate.crateType())) {
                    List<String> nonInfiniteSlots = tankDef.loadout().stream()
                            .filter(s -> !s.equals("basicShell") && !s.equals("standard"))
                            .toList();
                    if (!nonInfiniteSlots.isEmpty()) {
                        String slot = nonInfiniteSlots.get(new java.util.Random().nextInt(nonInfiniteSlots.size()));
                        int currentAmmo = tankState.weaponAmmo().getOrDefault(slot, 0);
                        tankState.weaponAmmo().put(slot, currentAmmo + 1);
                    }
                }
                crate.collected(true);
                iterator.remove();
            }
        }
    }

    @Override
    public ProjectileResolution fire(GameContent content, World world, TerrainModel terrain, String intentId,
            long projectileEntityId, long playerId, FireIntentIntentRequestPayload request) {
        TankState state = world.requireTankByPlayer(playerId);
        TankDefinition tankDef = content.requireTank(state.definitionId());
        
        String projectileId = state.selectedProjectileSlotId() != null ? state.selectedProjectileSlotId() : tankDef.loadout().getFirst();
        ProjectileDefinition projectileDef = content.requireProjectile(projectileId);

        if (state.weaponAmmo() != null && state.weaponAmmo().containsKey(projectileId)) {
            int currentAmmo = state.weaponAmmo().get(projectileId);
            if (currentAmmo > 0) {
                state.weaponAmmo().put(projectileId, currentAmmo - 1);
            }
        }

        double angleRad = request.getAngle();
        double barrelLength = 28.0;
        double turretYOffset = -14.0;
        double bodyAngle = terrain.slopeAngle(state.position().x(), tankDef.width());
        double pivotX = state.position().x() - turretYOffset * Math.sin(bodyAngle);
        double pivotY = state.position().y() + turretYOffset * Math.cos(bodyAngle);
        double launchX = pivotX + Math.cos(angleRad) * barrelLength;
        double launchY = pivotY + Math.sin(angleRad) * barrelLength;
        OnlineVec2Dto launch = new OnlineVec2Dto(round(launchX), round(launchY));

        double speed = request.getPower() * projectileDef.baseVelocity();
        double vx = speed * Math.cos(angleRad);
        double vy = speed * Math.sin(angleRad);
        double g = content.world().gravity() * projectileDef.gravityScale();
        double wind = world.match().wind();
        double dt = content.world().deltaTime();

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
            currVx += wind * dt;
            currVy += g * dt;

            if (projectileDef.drag() > 0) {
                currVx *= (1 - projectileDef.drag() * dt);
                currVy *= (1 - projectileDef.drag() * dt);
            }

            impact = new OnlineVec2Dto(round(currX), round(currY));
            trajectory.add(impact);

            if (currX < 0 || currX >= content.world().width()) {
                break;
            }

            var tankHit = hitTank(world, playerId, impact, projectileDef.radius(), content);
            if (tankHit.isPresent()) {
                hitTankState = tankHit.get();
                break;
            }

            double surfY = terrain.surfaceY(currX);
            if (currY >= surfY || terrain.intersectsCircle(currX, currY, projectileDef.radius())) {
                impact = new OnlineVec2Dto(round(currX), round(Math.min(surfY, currY)));
                trajectory.set(trajectory.size() - 1, impact);
                break;
            }
        }

        List<OnlineTankDamageResponseDto> damagedTanks = new ArrayList<>();
        double blastRadius = projectileDef.radius();
        int baseDamage = 50;
        if (projectileDef.damageEffect() instanceof Radial radial) {
            blastRadius = Math.max(blastRadius, radial.radius());
            baseDamage = (int) Math.round(radial.damage());
        } else if (projectileDef.damageEffect() instanceof Focused focused) {
            baseDamage = (int) Math.round(focused.damage());
        }

        for (TankState tank : world.tanks().values()) {
            if (!tank.alive()) continue;
            double dist = Math.hypot(impact.x() - tank.position().x(), impact.y() - tank.position().y());
            double tankCollisionRad = content.requireTank(tank.definitionId()).collisionRadius();
            if (hitTankState != null && hitTankState.entityId() == tank.entityId()) {
                int healthBefore = tank.health();
                int healthAfter = Math.max(0, healthBefore - baseDamage);
                tank.health(healthAfter);
                damagedTanks.add(new OnlineTankDamageResponseDto(tank.entityId(), tank.playerId(), baseDamage, healthAfter));
            } else if (dist <= blastRadius + tankCollisionRad) {
                int damage = baseDamage;
                if (projectileDef.damageEffect() instanceof Radial radial && radial.radius() > 0) {
                    double factor = Math.max(0.0, 1.0 - (dist / radial.radius()));
                    damage = (int) Math.round(baseDamage * factor);
                }
                if (damage > 0) {
                    int healthBefore = tank.health();
                    int healthAfter = Math.max(0, healthBefore - damage);
                    tank.health(healthAfter);
                    damagedTanks.add(new OnlineTankDamageResponseDto(tank.entityId(), tank.playerId(), damage, healthAfter));
                }
            }
        }

        List<SubMunitionTrajectoryDto> subMunitions = new ArrayList<>();
        if (projectileDef.subMunitions() != null && projectileDef.subMunitions().count() > 0) {
            SubMunitionConfig subConfig = projectileDef.subMunitions();
            ProjectileDefinition subProjDef = content.requireProjectile(subConfig.projectileDefinitionId());
            int count = subConfig.count();
            double spreadAngle = subConfig.spreadAngleDegrees();

            for (int i = 0; i < count; i++) {
                double angleDeg = count == 1 ? 90.0 : (90.0 - (spreadAngle / 2.0) + i * (spreadAngle / (count - 1)));
                double subAngleRad = Math.toRadians(angleDeg);
                double subSpeed = subProjDef.baseVelocity() * subConfig.velocityScale();
                double subVx = subSpeed * Math.cos(subAngleRad);
                double subVy = -subSpeed * Math.sin(subAngleRad);
                double subG = content.world().gravity() * subProjDef.gravityScale();

                OnlineVec2Dto subLaunch = impact;
                List<OnlineVec2Dto> subTrajectory = new ArrayList<>();
                subTrajectory.add(subLaunch);

                double subCurrX = subLaunch.x();
                double subCurrY = subLaunch.y();
                double subCurrVx = subVx;
                double subCurrVy = subVy;

                TankState subHitTankState = null;
                OnlineVec2Dto subImpact = subLaunch;

                for (int step = 0; step < content.world().maxProjectileSteps(); step++) {
                    subCurrX += subCurrVx * dt;
                    subCurrY += subCurrVy * dt;
                    subCurrVx += wind * dt;
                    subCurrVy += subG * dt;

                    if (subProjDef.drag() > 0) {
                        subCurrVx *= (1 - subProjDef.drag() * dt);
                        subCurrVy *= (1 - subProjDef.drag() * dt);
                    }

                    subImpact = new OnlineVec2Dto(round(subCurrX), round(subCurrY));
                    subTrajectory.add(subImpact);

                    if (subCurrX < 0 || subCurrX >= content.world().width()) {
                        break;
                    }

                    var tankHit = hitTank(world, playerId, subImpact, subProjDef.radius(), content);
                    if (tankHit.isPresent()) {
                        subHitTankState = tankHit.get();
                        break;
                    }

                    double surfY = terrain.surfaceY(subCurrX);
                    if (subCurrY >= surfY || terrain.intersectsCircle(subCurrX, subCurrY, subProjDef.radius())) {
                        subImpact = new OnlineVec2Dto(round(subCurrX), round(Math.min(surfY, subCurrY)));
                        subTrajectory.set(subTrajectory.size() - 1, subImpact);
                        break;
                    }
                }

                List<OnlineTankDamageResponseDto> subDamagedTanks = new ArrayList<>();
                if (subHitTankState != null) {
                    int damage = 30;
                    if (subProjDef.damageEffect() instanceof Radial radial) {
                        damage = (int) Math.round(radial.damage());
                    } else if (subProjDef.damageEffect() instanceof Focused focused) {
                        damage = (int) Math.round(focused.damage());
                    }
                    int healthBefore = subHitTankState.health();
                    int healthAfter = Math.max(0, healthBefore - damage);
                    subHitTankState.health(healthAfter);
                    subDamagedTanks.add(new OnlineTankDamageResponseDto(
                            subHitTankState.entityId(),
                            subHitTankState.playerId(),
                            damage,
                            healthAfter));
                }

                subMunitions.add(SubMunitionTrajectoryDto.builder()
                        .projectileDefinitionId(subProjDef.id())
                        .launch(subLaunch)
                        .trajectory(List.copyOf(subTrajectory))
                        .impact(subImpact)
                        .damagedTanks(List.copyOf(subDamagedTanks))
                        .build());
            }
        }

        if (projectileDef.damageTrail() != null) {
            DamageTrailConfig trailConfig = projectileDef.damageTrail();
            DamageTrailState trail = DamageTrailState.builder()
                    .id(UUID.randomUUID().toString())
                    .ownerPlayerId(playerId)
                    .position(impact)
                    .radius(trailConfig.radius())
                    .damagePerSecond(trailConfig.damagePerSecond())
                    .remainingTicks((int) Math.round(trailConfig.durationSeconds() * content.world().tickRateHz()))
                    .build();
            world.damageTrails().add(trail);
        }

        return ProjectileResolution.builder()
                .projectileEntityId(projectileEntityId)
                .ownerPlayerId(playerId)
                .projectileDefinitionId(projectileDef.id())
                .launch(launch)
                .trajectory(List.copyOf(trajectory))
                .impact(impact)
                .damagedTanks(List.copyOf(damagedTanks))
                .subMunitions(List.copyOf(subMunitions))
                .build();
    }

    @Override
    public TerrainPatch deformTerrain(GameContent content, World world, TerrainModel terrain,
            String projectileDefinitionId, OnlineVec2Dto impact) {
        ProjectileDefinition projectileDef = content.requireProjectile(projectileDefinitionId);
        var mutation = terrain.deform(impact.x(), impact.y(), projectileDef.terrainEffect());
        List<OnlineTerrainPatchResponseDto> patches = List.of(
                new HeightmapRange(
                        TerrainPatchKind.HEIGHTMAP_RANGE,
                        mutation.startX(),
                        mutation.surface()));
        return new TerrainPatch(patches);
    }
}
