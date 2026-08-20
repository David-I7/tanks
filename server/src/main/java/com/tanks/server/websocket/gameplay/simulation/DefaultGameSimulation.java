package com.tanks.server.websocket.gameplay.simulation;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
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
import com.tanks.server.websocket.gameplay.world.DamageTrailState;
import com.tanks.server.websocket.gameplay.world.LootCrateState;
import com.tanks.server.websocket.gameplay.world.TankState;
import com.tanks.server.websocket.gameplay.world.TerrainModel;
import com.tanks.server.websocket.gameplay.world.World;

import com.tanks.server.websocket.dto.gameplay.diffResponse.SubMunitionTrajectoryDto;
import com.tanks.server.websocket.gameplay.content.definitions.DamageTrailConfig;
import com.tanks.server.websocket.gameplay.content.definitions.SubMunitionConfig;

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
            LootCrateState crate = iterator.next();
            if (crate.collected()) {
                iterator.remove();
                continue;
            }
            double dist = Math.hypot(x - crate.x(), y - crate.y());
            if (dist <= content.world().lootCrates().collectionRadius()) {
                int val = crate.value();
                if ("hp".equalsIgnoreCase(crate.crateType())) {
                    tankState.health(Math.min(tankDef.maxHealth(), tankState.health() + val));
                } else if ("fuel".equalsIgnoreCase(crate.crateType())) {
                    tankState.fuel(Math.min(tankDef.maxFuel(), tankState.fuel() + val));
                } else if ("ammo".equalsIgnoreCase(crate.crateType())) {
                    List<String> nonInfiniteSlots = tankDef.loadout().stream()
                            .filter(s -> !s.equals(tankDef.loadout().getFirst()))
                            .toList();
                    if (!nonInfiniteSlots.isEmpty()) {
                        String slot = nonInfiniteSlots.get(new Random().nextInt(nonInfiniteSlots.size()));
                        int currentAmmo = tankState.weaponAmmo().getOrDefault(slot, 0);
                        tankState.weaponAmmo().put(slot, currentAmmo + 1);
                    }
                }
                crate.collected(true);
                iterator.remove();
            }
        }
    }

    private record TrajectoryOutcome(
            List<OnlineVec2Dto> trajectory,
            OnlineVec2Dto impact,
            TankState hitTankState,
            boolean reachedApex,
            OnlineVec2Dto apexPoint,
            int apexStepIndex,
            double finalVx,
            double finalVy) {}

    private TrajectoryOutcome integrateTrajectory(
            GameContent content,
            World world,
            TerrainModel terrain,
            long playerId,
            double launchX,
            double launchY,
            double vx,
            double vy,
            double gravityScale,
            double projectileRadius) {
        double g = content.world().gravity() * gravityScale;
        double wind = world.match().wind();
        double dt = content.world().deltaTime();

        List<OnlineVec2Dto> trajectory = new ArrayList<>();
        OnlineVec2Dto launch = new OnlineVec2Dto(round(launchX), round(launchY));
        trajectory.add(launch);

        double currX = launchX;
        double currY = launchY;
        double currVx = vx;
        double currVy = vy;

        TankState hitTankState = null;
        OnlineVec2Dto impact = launch;
        boolean reachedApex = false;
        OnlineVec2Dto apexPoint = null;
        int apexStepIndex = -1;

        for (int step = 0; step < content.world().maxProjectileSteps(); step++) {
            double prevVy = currVy;
            currX += currVx * dt;
            currY += currVy * dt;
            currVx += wind * dt;
            currVy += g * dt;

            if (prevVy < 0 && currVy >= 0 && !reachedApex) {
                reachedApex = true;
                apexPoint = new OnlineVec2Dto(round(currX), round(currY));
                apexStepIndex = trajectory.size();
            }

            impact = new OnlineVec2Dto(round(currX), round(currY));
            trajectory.add(impact);

            if (currX < 0 || currX >= content.world().width()) {
                break;
            }

            var tankHit = hitTank(world, playerId, impact, projectileRadius, content);
            if (tankHit.isPresent()) {
                hitTankState = tankHit.get();
                break;
            }

            double surfY = terrain.surfaceY(currX);
            if (currY >= surfY || terrain.intersectsCircle(currX, currY, projectileRadius)) {
                impact = new OnlineVec2Dto(round(currX), round(Math.min(surfY, currY)));
                trajectory.set(trajectory.size() - 1, impact);
                break;
            }
        }

        return new TrajectoryOutcome(trajectory, impact, hitTankState, reachedApex, apexPoint, apexStepIndex, currVx, currVy);
    }

    private List<OnlineTankDamageResponseDto> calculateDamage(
            GameContent content,
            World world,
            OnlineVec2Dto impact,
            TankState directHitTankState,
            double blastRadius,
            int baseDamage,
            boolean isFocused) {
        List<OnlineTankDamageResponseDto> damagedTanks = new ArrayList<>();
        for (TankState tank : world.tanks().values()) {
            if (!tank.alive()) continue;
            double dist = Math.hypot(impact.x() - tank.position().x(), impact.y() - tank.position().y());
            double tankCollisionRad = content.requireTank(tank.definitionId()).collisionRadius();
            if (directHitTankState != null && directHitTankState.entityId() == tank.entityId()) {
                int healthBefore = tank.health();
                int healthAfter = Math.max(0, healthBefore - baseDamage);
                tank.health(healthAfter);
                damagedTanks.add(new OnlineTankDamageResponseDto(tank.entityId(), tank.playerId(), baseDamage, healthAfter));
            } else if (dist <= blastRadius + tankCollisionRad) {
                int damage = baseDamage;
                if (!isFocused && blastRadius > 0) {
                    double factor = Math.max(0.0, 1.0 - (dist / blastRadius));
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
        return damagedTanks;
    }

    @Override
    public ProjectileResolution fire(GameContent content, World world, TerrainModel terrain, String intentId,
            long projectileEntityId, long playerId, FireIntentIntentRequestPayload request) {
        TankState state = world.requireTankByPlayer(playerId);
        TankDefinition tankDef = content.requireTank(state.definitionId());

        String projectileId = state.selectedProjectileSlotId();
        if (projectileId == null || !tankDef.loadout().contains(projectileId)) {
            throw new IllegalStateException("Tank " + playerId + " has no valid selected projectile slot");
        }
        ProjectileDefinition projectileDef = content.requireProjectile(projectileId);

        if (state.weaponAmmo() != null && state.weaponAmmo().containsKey(projectileId)) {
            int currentAmmo = state.weaponAmmo().get(projectileId);
            if (currentAmmo > 0) {
                state.weaponAmmo().put(projectileId, currentAmmo - 1);
            }
        }

        double angleRad = request.angle();
        double barrelLength = tankDef.barrelLength();
        double turretYOffset = tankDef.turretYOffset();
        double bodyAngle = terrain.slopeAngle(state.position().x(), tankDef.width());
        double launchAngle = bodyAngle + angleRad;
        double pivotX = state.position().x() - turretYOffset * Math.sin(bodyAngle);
        double pivotY = state.position().y() + turretYOffset * Math.cos(bodyAngle);
        double launchX = pivotX + Math.cos(launchAngle) * barrelLength;
        double launchY = pivotY + Math.sin(launchAngle) * barrelLength;
        OnlineVec2Dto launch = new OnlineVec2Dto(round(launchX), round(launchY));

        double speed = request.power() * projectileDef.baseVelocity();
        double vx = speed * Math.cos(launchAngle);
        double vy = speed * Math.sin(launchAngle);

        double initialGravityScale = projectileDef.salvo() != null && !projectileDef.salvo().gravityScales().isEmpty()
                ? projectileDef.salvo().gravityScales().getFirst()
                : projectileDef.gravityScale();

        TrajectoryOutcome primaryOutcome = integrateTrajectory(
                content, world, terrain, playerId, launchX, launchY, vx, vy, initialGravityScale, projectileDef.radius());

        List<OnlineVec2Dto> trajectory = primaryOutcome.trajectory();
        OnlineVec2Dto impact = primaryOutcome.impact();
        TankState hitTankState = primaryOutcome.hitTankState();

        List<OnlineTankDamageResponseDto> damagedTanks = new ArrayList<>();
        List<SubMunitionTrajectoryDto> subMunitions = new ArrayList<>();

        double blastRadius = projectileDef.radius();
        int baseDamage = 0;
        boolean isFocused = false;
        if (projectileDef.damageEffect() instanceof Radial radial) {
            blastRadius = Math.max(blastRadius, radial.radius());
            baseDamage = (int) Math.round(radial.damage());
        } else if (projectileDef.damageEffect() instanceof Focused focused) {
            baseDamage = (int) Math.round(focused.damage());
            isFocused = true;
        }

        // 1. APEX SPLIT HANDLING
        if (projectileDef.apexSplit() != null) {
            var apexConfig = projectileDef.apexSplit();
            // Check if apex was reached before impact (if hitTankState == null or apexStepIndex < trajectory.size() - 1)
            boolean splitAtApex = primaryOutcome.reachedApex() && primaryOutcome.apexPoint() != null
                    && (hitTankState == null || primaryOutcome.apexStepIndex() < primaryOutcome.trajectory().size() - 1);

            if (splitAtApex) {
                // Truncate primary trajectory to apex point
                int apexIdx = Math.min(primaryOutcome.apexStepIndex(), trajectory.size() - 1);
                trajectory = new ArrayList<>(trajectory.subList(0, apexIdx + 1));
                impact = primaryOutcome.apexPoint();
                // Base damage from primary shell is 0 when split at apex
                damagedTanks.clear();

                int shardCount = Math.max(1, apexConfig.splitCount());
                int shardDamage = Math.max(1, apexConfig.totalDamagePool() / shardCount);
                double shardSpreadVel = apexConfig.spreadVelocity();
                OnlineVec2Dto apexLoc = primaryOutcome.apexPoint();

                for (int i = 0; i < shardCount; i++) {
                    // Downward fan spread: 30 deg to 150 deg (in screen space, sin > 0 is downward)
                    double fanAngleDeg = shardCount == 1 ? 90.0 : (30.0 + i * (120.0 / (shardCount - 1)));
                    double fanAngleRad = Math.toRadians(fanAngleDeg);
                    double shardVx = shardSpreadVel * Math.cos(fanAngleRad);
                    double shardVy = shardSpreadVel * Math.sin(fanAngleRad);

                    TrajectoryOutcome shardOutcome = integrateTrajectory(
                            content, world, terrain, playerId, apexLoc.x(), apexLoc.y(), shardVx, shardVy, 1.0, 3.0);

                    List<OnlineTankDamageResponseDto> shardDamagedTanks = calculateDamage(
                            content, world, shardOutcome.impact(), shardOutcome.hitTankState(), 25.0, shardDamage, false);

                    subMunitions.add(SubMunitionTrajectoryDto.builder()
                            .projectileDefinitionId(projectileDef.id() + "_shard")
                            .launch(apexLoc)
                            .trajectory(shardOutcome.trajectory())
                            .impact(shardOutcome.impact())
                            .damagedTanks(shardDamagedTanks)
                            .delaySeconds(0.0)
                            .build());
                }
            } else {
                // Impacted obstacle before apex was reached: standard impact damage
                damagedTanks = calculateDamage(content, world, impact, hitTankState, blastRadius, baseDamage, isFocused);
            }
        } else {
            // Standard damage calculation for primary shot
            damagedTanks = calculateDamage(content, world, impact, hitTankState, blastRadius, baseDamage, isFocused);
        }

        // 2. SALVO WEAPON HANDLING
        if (projectileDef.salvo() != null && projectileDef.salvo().shotCount() > 1) {
            var salvoConfig = projectileDef.salvo();
            int totalShots = salvoConfig.shotCount();
            double delayStep = salvoConfig.delaySeconds();

            for (int i = 1; i < totalShots; i++) {
                double salvoGravityScale = i < salvoConfig.gravityScales().size()
                        ? salvoConfig.gravityScales().get(i)
                        : projectileDef.gravityScale();
                double salvoDelay = round(i * delayStep);

                TrajectoryOutcome salvoOutcome = integrateTrajectory(
                        content, world, terrain, playerId, launchX, launchY, vx, vy, salvoGravityScale, projectileDef.radius());

                List<OnlineTankDamageResponseDto> salvoDamagedTanks = calculateDamage(
                        content, world, salvoOutcome.impact(), salvoOutcome.hitTankState(), blastRadius, baseDamage, isFocused);

                subMunitions.add(SubMunitionTrajectoryDto.builder()
                        .projectileDefinitionId(projectileDef.id())
                        .launch(launch)
                        .trajectory(salvoOutcome.trajectory())
                        .impact(salvoOutcome.impact())
                        .damagedTanks(salvoDamagedTanks)
                        .delaySeconds(salvoDelay)
                        .build());
            }
        }

        // 3. BOUNCER WEAPON HANDLING
        if (projectileDef.bouncer() != null) {
            var bouncerConfig = projectileDef.bouncer();
            int totalBounces = bouncerConfig.bounceCount();
            double bounceDamage = bouncerConfig.damagePerBounce();
            double shockRadius = bouncerConfig.shockwaveRadius();

            double currentX = impact.x();
            double currentY = terrain.surfaceY(currentX) - 4;
            double currentVx = primaryOutcome.finalVx() * 0.65;
            double currentVy = -Math.abs(primaryOutcome.finalVy()) * 0.65 - 130;
            double accumulatedDelay = (trajectory.size() - 1) * content.world().deltaTime();

            for (int i = 1; i < totalBounces; i++) {
                TrajectoryOutcome bounceOutcome = integrateTrajectory(
                        content, world, terrain, playerId, currentX, currentY, currentVx, currentVy,
                        projectileDef.gravityScale(), projectileDef.radius());

                List<OnlineTankDamageResponseDto> bounceDamagedTanks = calculateDamage(
                        content, world, bounceOutcome.impact(), bounceOutcome.hitTankState(),
                        shockRadius, (int) Math.round(bounceDamage), false);

                subMunitions.add(SubMunitionTrajectoryDto.builder()
                        .projectileDefinitionId(projectileDef.id())
                        .launch(new OnlineVec2Dto(round(currentX), round(currentY)))
                        .trajectory(bounceOutcome.trajectory())
                        .impact(bounceOutcome.impact())
                        .damagedTanks(bounceDamagedTanks)
                        .delaySeconds(round(accumulatedDelay))
                        .build());

                accumulatedDelay += (bounceOutcome.trajectory().size() - 1) * content.world().deltaTime();
                currentX = bounceOutcome.impact().x();
                currentY = terrain.surfaceY(currentX) - 4;
                currentVx = bounceOutcome.finalVx() * 0.65;
                currentVy = -Math.abs(bounceOutcome.finalVy()) * 0.65 - 130;
            }
        }

        // 4. LEGACY SUBMUNITIONS (if defined)
        if (projectileDef.subMunitions() != null && projectileDef.subMunitions().count() > 0) {
            SubMunitionConfig subConfig = projectileDef.subMunitions();
            ProjectileDefinition subProjDef = content.requireProjectile(subConfig.projectileDefinitionId());
            int count = subConfig.count();
            double spreadAngle = subConfig.spreadAngleDegrees();
            double dt = content.world().deltaTime();

            for (int i = 0; i < count; i++) {
                double angleDeg = count == 1 ? 90.0 : (90.0 - (spreadAngle / 2.0) + i * (spreadAngle / (count - 1)));
                double subAngleRad = Math.toRadians(angleDeg);
                double subSpeed = subProjDef.baseVelocity() * subConfig.velocityScale();
                double subVx = subSpeed * Math.cos(subAngleRad);
                double subVy = -subSpeed * Math.sin(subAngleRad);

                TrajectoryOutcome subOutcome = integrateTrajectory(
                        content, world, terrain, playerId, impact.x(), impact.y(), subVx, subVy, subProjDef.gravityScale(), subProjDef.radius());

                int subBaseDamage = 0;
                double subBlastRadius = subProjDef.radius();
                boolean subIsFocused = false;
                if (subProjDef.damageEffect() instanceof Radial r) {
                    subBlastRadius = Math.max(subBlastRadius, r.radius());
                    subBaseDamage = (int) Math.round(r.damage());
                } else if (subProjDef.damageEffect() instanceof Focused f) {
                    subBaseDamage = (int) Math.round(f.damage());
                    subIsFocused = true;
                }

                List<OnlineTankDamageResponseDto> subDamagedTanks = calculateDamage(
                        content, world, subOutcome.impact(), subOutcome.hitTankState(), subBlastRadius, subBaseDamage, subIsFocused);

                subMunitions.add(SubMunitionTrajectoryDto.builder()
                        .projectileDefinitionId(subProjDef.id())
                        .launch(impact)
                        .trajectory(subOutcome.trajectory())
                        .impact(subOutcome.impact())
                        .damagedTanks(subDamagedTanks)
                        .delaySeconds(0.0)
                        .build());
            }
        }

        // 5. TYPED HAZARD TRAILS
        if (projectileDef.damageTrail() != null) {
            DamageTrailConfig trailConfig = projectileDef.damageTrail();
            DamageTrailState trail = DamageTrailState.builder()
                    .id(UUID.randomUUID().toString())
                    .ownerPlayerId(playerId)
                    .position(impact)
                    .radius(trailConfig.radius())
                    .damagePerSecond(trailConfig.damagePerSecond())
                    .remainingTicks((int) Math.round(trailConfig.durationSeconds() * content.world().tickRateHz()))
                    .hazardType(trailConfig.hazardType())
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

