import { LocalWorld } from "../world/LocalWorld";
import { LocalTerrainModel } from "./LocalTerrainModel";
import {
  type DamageEffect,
  type EntityId,
  type LocalSimulationState,
  type GameAction,
  type ProjectileComponent,
  type ProjectileDefinition,
  type TankComponent,
  type DamageTrail,
  type LootCrate,
  type LootCrateType,
} from "../types";
import type { GameContent } from "../rendering/ResourceManager";
import {
  getMuzzlePosition,
  clampAimAngle,
  TURRET_Y_OFFSET,
  BARREL_LENGTH,
} from "./ballistics";
import {
  ClientVisualSimulation,
  DEFAULT_EXPLOSION_PALETTE,
} from "./ClientVisualSimulation";

export class LocalSimulation {
  private transitionTimer = 0;
  private pendingProjectiles: Array<{
    delayRemaining: number;
    ownerPlayerId: number;
    projectileDefinition: ProjectileDefinition;
    power: number;
    tankX: number;
    tankY: number;
    aimAngle: number;
    bodyAngle: number;
  }> = [];
  private damageTrails: DamageTrail[] = [];
  private lootCrates: LootCrate[] = [];
  private screenShake = 0;
  private cratesSpawned = { minute1: false, minute2: false, minute3: false };
  private lastImpactX: number | null = null;
  private visualSim: ClientVisualSimulation;

  constructor(
    readonly world: LocalWorld,
    readonly terrain: LocalTerrainModel,
    readonly content: GameContent,
  ) {
    this.visualSim = new ClientVisualSimulation(
      world.match.cameraX ?? 0,
      terrain.width,
    );
  }

  submitPlayerAction(playerId: number, action: GameAction): boolean {
    if (action.type === "panCamera") {
      this.panCamera(action.deltaX);
      return true;
    }

    if (action.type === "relockCamera") {
      this.relockCamera();
      return true;
    }

    if (this.world.match.phase !== "thinking" || this.damageTrails.length > 0) {
      return false;
    }
    if (this.world.match.activePlayerId !== playerId) return false;

    const tankEntityId = this.world.tankEntitiesByPlayer.get(playerId);
    if (!tankEntityId) return false;

    const tank = this.world.tanks.get(tankEntityId);
    const position = this.world.positions.get(tankEntityId);
    if (!tank || !position || !tank.alive) return false;

    if (action.type === "move") {
      if (tank.fuel <= 0 || this.damageTrails.length > 0) return false;
      if (action.direction !== -1 && action.direction !== 1) return false;

      const definition = this.content.tanks[tank.tankDefinitionId];
      if (!definition) {
        throw new Error(`Missing tank definition "${tank.tankDefinitionId}"`);
      }
      const climbCapability = definition.climbCapability;
      const fuelRate = definition.fuelRate;
      const halfWidth = Math.floor(definition.width / 2);
      const trackGroundOffset = definition.height / 2;
      const movementQuantum = 4; // 4px per 60Hz tick matching 24px per 100ms on server

      tank.facing = action.direction;
      let currentX = position.x;
      let currentY = position.y;
      let moved = false;

      for (let step = 0; step < movementQuantum; step += 1) {
        const nextX = Math.round(currentX) + action.direction;
        if (nextX - halfWidth < 0 || nextX + halfWidth >= this.terrain.width) {
          break;
        }
        const surfaceY = this.terrain.getSurfaceY(nextX);
        const nextY = surfaceY - trackGroundOffset;
        if (currentY - nextY > climbCapability) {
          break;
        }
        const ledge = nextY - currentY > climbCapability;
        const cost = Math.ceil(
          fuelRate *
            (ledge
              ? Math.abs(nextX - currentX)
              : Math.hypot(nextX - currentX, nextY - currentY)),
        );
        if (cost > tank.fuel) {
          break;
        }
        tank.fuel -= cost;
        currentX = nextX;
        currentY = nextY;
        moved = true;
        if (ledge) {
          break;
        }
      }

      if (moved) {
        position.x = currentX;
        position.y = currentY;
        tank.bodyAngle = this.terrain.getSlopeAngle(position.x);
        return true;
      }
      return false;
    }

    if (action.type === "selectProjectileSlot") {
      if (!this.resolveProjectileDefinition(tank, action.projectileSlotId)) {
        return false;
      }
      tank.selectedProjectileSlotId = action.projectileSlotId;
      return true;
    }

    const minPower = this.content.validation?.minFirePower ?? 0;
    const maxPower = this.content.validation?.maxFirePower ?? 1000;
    tank.aimAngle = clampAimAngle(action.angle);
    tank.power = Math.max(minPower, Math.min(action.power, maxPower));

    if (action.type === "fire") {
      const currentAmmo = tank.weaponAmmo[action.projectileSlotId];
      if (currentAmmo === undefined || currentAmmo === 0) {
        return false;
      }
      const projectileDefinition = this.resolveProjectileDefinition(
        tank,
        action.projectileSlotId,
      );
      if (!projectileDefinition) return false;

      if (currentAmmo > 0) {
        tank.weaponAmmo[action.projectileSlotId] = currentAmmo - 1;
      }
      tank.selectedProjectileSlotId = action.projectileSlotId;

      this.fireWeaponPattern(tank, projectileDefinition, position.x, position.y);
      this.world.match.phase = "ballistics";
      this.world.match.isCameraLocked = true;
      this.world.match.turnTimeRemaining = 0;
    }

    return true;
  }

  update(dt: number): void {
    if (this.world.match.phase !== "gameOver") {
      this.world.match.matchTimeRemaining = Math.max(
        0,
        this.world.match.matchTimeRemaining - dt,
      );
      if (this.world.match.matchTimeRemaining < 0.001) {
        this.world.match.matchTimeRemaining = 0;
      }

      const schedule = this.content.world.lootCrates?.spawnScheduleSeconds ?? [120, 60, 30];
      if (schedule.length >= 3) {
        if (
          this.world.match.matchTimeRemaining <= schedule[0] + 0.001 &&
          !this.cratesSpawned.minute1
        ) {
          this.cratesSpawned.minute1 = true;
          this.spawnLootCrate();
        }
        if (
          this.world.match.matchTimeRemaining <= schedule[1] + 0.001 &&
          !this.cratesSpawned.minute2
        ) {
          this.cratesSpawned.minute2 = true;
          this.spawnLootCrate();
        }
        if (
          this.world.match.matchTimeRemaining <= schedule[2] + 0.001 &&
          !this.cratesSpawned.minute3
        ) {
          this.cratesSpawned.minute3 = true;
          this.spawnLootCrate();
        }
      }
      if (
        this.world.match.matchTimeRemaining <= 0.001
      ) {
        this.handleMatchTimeout();
      }
    }

    this.updateLootCrates(dt);
    this.visualSim.updateEffects(dt, this.terrain.width);

    const activeTankEntityId = this.world.tankEntitiesByPlayer.get(
      this.world.match.activePlayerId,
    );
    const pos = activeTankEntityId
      ? this.world.positions.get(activeTankEntityId)
      : null;
    const activeProjId = [...this.world.projectiles.keys()][0];
    const projPos =
      activeProjId !== undefined
        ? this.world.positions.get(activeProjId)
        : null;
    const focusX = projPos?.x ?? this.lastImpactX ?? pos?.x ?? null;
    this.visualSim.updateCamera(dt, focusX);

    const visState = this.visualSim.getState();
    this.world.match.cameraX = visState.cameraX;
    this.world.match.isCameraLocked = visState.isCameraLocked;

    this.screenShake *= 0.85;
    if (this.screenShake < 0.1) this.screenShake = 0;

    if (this.world.match.phase === "thinking") {
      if (this.updateTurnTimer(dt)) return;
    }

    this.updatePendingProjectiles(dt);
    this.updateDamageTrails(dt);

    if (this.world.match.phase === "ballistics") {
      this.updateProjectiles(dt);
      if (
        this.world.projectiles.size === 0 &&
        this.pendingProjectiles.length === 0 &&
        this.damageTrails.length === 0
      ) {
        this.world.match.phase =
          this.world.impactEvents.size > 0 ? "impact" : "transition";
      }
    }

    if (this.world.match.phase === "impact") {
      this.updateImpactEvents(dt);
      if (this.world.impactEvents.size === 0) {
        this.world.match.phase = "transition";
      }
    }

    if (this.world.match.phase === "transition") {
      this.transitionTimer += dt;
      const delay = this.content.world.postImpactDelaySeconds ?? 0.55;
      if (this.transitionTimer >= delay) {
        this.transitionTimer = 0;
        this.advanceTurn();
      }
    }

    this.updateTankGrounding();
    this.updateWinner();
  }

  getState(): LocalSimulationState {
    const visState = this.visualSim.getState();
    this.world.match.cameraX = visState.cameraX;
    this.world.match.isCameraLocked = visState.isCameraLocked;
    return {
      match: this.world.match,
      terrain: this.terrain.snapshot(),
      tanks: [...this.world.tanks].map(([entityId, tank]) => ({
        entityId,
        position: this.world.positions.get(entityId)!,
        tank,
      })),
      projectiles: [...this.world.projectiles].map(
        ([entityId, projectile]) => ({
          entityId,
          position: this.world.positions.get(entityId)!,
          velocity: this.world.velocities.get(entityId)!,
          projectile,
        }),
      ),
      impactEvents: [...this.world.impactEvents.values()],
      damageTrails: this.damageTrails,
      lootCrates: this.lootCrates,
      particles: visState.particles,
      floatingTexts: visState.floatingTexts,
      decors: this.world.decors,
      clouds: visState.clouds,
    };
  }

  setCameraLocked(locked: boolean): void {
    if (locked) {
      this.visualSim.relockCamera();
    }
  }

  panCamera(deltaX: number): void {
    if (this.world.match.isCameraLocked !== false) {
      const activeTankEntityId = this.world.tankEntitiesByPlayer.get(
        this.world.match.activePlayerId,
      );
      const pos = activeTankEntityId
        ? this.world.positions.get(activeTankEntityId)
        : null;
      if (pos) {
        this.visualSim.setCameraPosition(pos.x);
      }
    }

    this.visualSim.panCamera(deltaX);
    const visState = this.visualSim.getState();
    this.world.match.cameraX = visState.cameraX;
    this.world.match.isCameraLocked = visState.isCameraLocked;
  }

  relockCamera(): void {
    this.visualSim.relockCamera();
    const activeTankEntityId = this.world.tankEntitiesByPlayer.get(
      this.world.match.activePlayerId,
    );
    const pos = activeTankEntityId
      ? this.world.positions.get(activeTankEntityId)
      : null;
    if (pos) {
      this.visualSim.setCameraPosition(pos.x);
    }
    const visState = this.visualSim.getState();
    this.world.match.cameraX = visState.cameraX;
    this.world.match.isCameraLocked = visState.isCameraLocked;
  }

  private fireWeaponPattern(
    tank: TankComponent,
    projectileDefinition: ProjectileDefinition,
    tankX: number,
    tankY: number,
  ): void {
    this.spawnProjectileWithAngle(
      tank.playerId,
      projectileDefinition,
      tank.power,
      tankX,
      tankY,
      tank.aimAngle,
      tank.bodyAngle ?? 0,
    );
  }

  private spawnProjectileWithAngle(
    ownerPlayerId: number,
    projectileDefinition: ProjectileDefinition,
    power: number,
    tankX: number,
    tankY: number,
    aimAngle: number,
    bodyAngle: number,
  ): void {
    const activeTank = this.world.tanks.get(
      this.world.tankEntitiesByPlayer.get(ownerPlayerId) ?? 0,
    );
    const tankDef = activeTank
      ? this.content.tanks[activeTank.tankDefinitionId]
      : null;
    const barrelLength = tankDef?.barrelLength ?? BARREL_LENGTH;
    const turretYOffset = tankDef?.turretYOffset ?? TURRET_Y_OFFSET;

    const muzzle = getMuzzlePosition(
      tankX,
      tankY,
      aimAngle,
      bodyAngle,
      turretYOffset,
      barrelLength,
    );
    const launchAngle = bodyAngle + aimAngle;
    const speed = power * projectileDefinition.baseVelocity;
    this.world.createProjectile(
      ownerPlayerId,
      projectileDefinition,
      power,
      muzzle.x,
      muzzle.y,
      Math.cos(launchAngle) * speed,
      Math.sin(launchAngle) * speed,
    );
  }

  private updatePendingProjectiles(dt: number): void {
    if (this.pendingProjectiles.length === 0) return;
    const nextPending: typeof this.pendingProjectiles = [];
    for (const pending of this.pendingProjectiles) {
      pending.delayRemaining -= dt;
      if (pending.delayRemaining <= 0) {
        this.spawnProjectileWithAngle(
          pending.ownerPlayerId,
          pending.projectileDefinition,
          pending.power,
          pending.tankX,
          pending.tankY,
          pending.aimAngle,
          pending.bodyAngle,
        );
      } else {
        nextPending.push(pending);
      }
    }
    this.pendingProjectiles = nextPending;
  }

  private updateDamageTrails(dt: number): void {
    if (this.damageTrails.length === 0) return;
    const nextTrails: typeof this.damageTrails = [];
    for (const trail of this.damageTrails) {
      trail.remainingDuration -= dt;
      const damageThisTick = trail.damagePerSecond * dt;
      for (const [entityId, tank] of this.world.tanks) {
        if (!tank.alive) continue;
        const pos = this.world.positions.get(entityId);
        if (!pos) continue;
        const dist = Math.hypot(pos.x - trail.position.x, pos.y - 18 - trail.position.y);
        if (dist <= trail.radius) {
          tank.health = Math.max(0, tank.health - damageThisTick);
          tank.alive = tank.health > 0;
        }
      }
      if (trail.remainingDuration > 0) {
        nextTrails.push(trail);
      }
    }
    this.damageTrails = nextTrails;
  }

  private updateProjectiles(dt: number): void {
    const projectiles = [...this.world.projectiles];

    for (const [entityId, projectile] of projectiles) {
      const position = this.world.positions.get(entityId);
      const velocity = this.world.velocities.get(entityId);
      if (!position || !velocity) continue;

      velocity.x += (this.world.match.wind ?? 0) * dt;
      velocity.y += this.content.world.gravity * projectile.physics.gravityScale * dt;
      position.x += velocity.x * dt;
      position.y += velocity.y * dt;
      projectile.position.x = position.x;
      projectile.position.y = position.y;
      projectile.velocity.x = velocity.x;
      projectile.velocity.y = velocity.y;

      const hitTankEntityId = this.findHitTank(entityId, projectile);
      const hitTerrain = this.terrain.intersectsCircle(
        position.x,
        position.y,
        projectile.radius,
      );
      const outOfBounds =
        position.y > this.terrain.height ||
        position.x < 0 ||
        position.x > this.terrain.width;

      if (hitTankEntityId !== null || hitTerrain || outOfBounds) {
        if (!outOfBounds) {
          this.resolveImpact(position.x, position.y, projectile, hitTankEntityId);
        }
        this.world.destroyEntity(entityId);
        if (
          this.world.projectiles.size === 0 &&
          this.pendingProjectiles.length === 0 &&
          this.damageTrails.length === 0
        ) {
          this.world.match.phase =
            this.world.impactEvents.size > 0 ? "impact" : "transition";
        }
      }
    }
  }

  private findHitTank(
    projectileEntityId: EntityId,
    projectile: ProjectileComponent,
  ): EntityId | null {
    const projectilePosition = this.world.positions.get(projectileEntityId);
    if (!projectilePosition) return null;

    for (const [tankEntityId, tank] of this.world.tanks) {
      if (tank.playerId === projectile.ownerPlayerId || !tank.alive) continue;
      const tankPosition = this.world.positions.get(tankEntityId);
      if (!tankPosition) continue;

      const dx = projectilePosition.x - tankPosition.x;
      const dy = projectilePosition.y - (tankPosition.y - tank.height * 0.5);
      if (Math.hypot(dx, dy) <= tank.width * 0.5 + projectile.radius) {
        return tankEntityId;
      }
    }

    return null;
  }

  private resolveImpact(
    x: number,
    y: number,
    projectile: ProjectileComponent,
    directHitTankEntityId: EntityId | null,
  ): void {
    this.lastImpactX = x;
    this.terrain.applyTerrainEffect(x, y, projectile.terrainEffect);
    this.world.createImpactEvent(x, y, projectile);
    this.applyDamageEffect(x, y, projectile.damageEffect, directHitTankEntityId);
    this.spawnExplosionParticles(x, y, DEFAULT_EXPLOSION_PALETTE);
    this.screenShake = 12;

    const blastRadius = Math.max(
      30,
      projectile.terrainEffect.radius !== undefined
        ? projectile.terrainEffect.radius
        : projectile.damageEffect.radius,
    );
    for (const decor of this.world.decors) {
      if (
        !decor.destroyed &&
        Math.hypot(decor.x - x, decor.y - y) <= blastRadius * 1.1
      ) {
        decor.destroyed = true;
      }
    }

    const projectileDef = this.content.projectiles[projectile.projectileDefinitionId];
    if (projectileDef?.subMunitions && projectileDef.subMunitions.count > 0) {
      const subConfig = projectileDef.subMunitions;
      const subProjDef = this.content.projectiles[subConfig.projectileDefinitionId];
      if (subProjDef) {
        const count = subConfig.count;
        const spreadAngle = subConfig.spreadAngleDegrees;
        for (let i = 0; i < count; i++) {
          const angleDeg =
            count === 1
              ? 90.0
              : 90.0 - spreadAngle / 2.0 + (i * spreadAngle) / (count - 1);
          const subAngleRad = -(angleDeg * Math.PI) / 180;
          const subPower = projectile.power * subConfig.velocityScale;
          this.world.createProjectile(
            projectile.ownerPlayerId,
            subProjDef,
            subPower,
            x,
            y - 4,
            Math.cos(subAngleRad) * subPower,
            Math.sin(subAngleRad) * subPower,
          );
        }
      }
    }

    if (projectileDef?.damageTrail) {
      this.damageTrails.push({
        id: `hazard-${Date.now()}-${Math.random()}`,
        position: { x, y },
        radius: projectileDef.damageTrail.radius,
        damagePerSecond: projectileDef.damageTrail.damagePerSecond,
        remainingDuration: projectileDef.damageTrail.durationSeconds,
        ownerPlayerId: projectile.ownerPlayerId,
      });
    }
  }

  private applyDamageEffect(
    x: number,
    y: number,
    damageEffect: DamageEffect,
    directHitTankEntityId: EntityId | null,
  ): void {
    const damageRadius = damageEffect.radius;

    for (const [entityId, tank] of this.world.tanks) {
      if (!tank.alive) continue;
      const position = this.world.positions.get(entityId);
      if (!position) continue;

      if (directHitTankEntityId !== null && directHitTankEntityId === entityId) {
        const damageAmount = damageEffect.damage;
        tank.health = Math.max(0, tank.health - damageAmount);
        tank.alive = tank.health > 0;
        this.spawnFloatingText(`-${damageAmount} HP`, "#ef4444", position.x, position.y - 30);
        continue;
      }

      const dx = x - position.x;
      const dy = y - (position.y - tank.height * 0.5);
      const distance = Math.hypot(dx, dy);
      const tankCollisionRadius = tank.width * 0.5;
      const effectiveDistance = Math.max(0, distance - tankCollisionRadius);

      if (effectiveDistance > damageRadius) continue;

      const falloff =
        damageEffect.type === "focused"
          ? Math.max(0, 1 - effectiveDistance / damageRadius) ** 2
          : 1 - effectiveDistance / damageRadius;
      const damageAmount = Math.ceil(damageEffect.damage * falloff);
      if (damageAmount > 0) {
        tank.health = Math.max(0, tank.health - damageAmount);
        tank.alive = tank.health > 0;
        this.spawnFloatingText(`-${damageAmount} HP`, "#ef4444", position.x, position.y - 30);
      }
    }
  }

  private updateTankGrounding(): void {
    for (const [entityId, tank] of this.world.tanks) {
      const position = this.world.positions.get(entityId);
      if (!position || !tank.alive) continue;
      position.y = this.terrain.getSurfaceY(position.x) - tank.height / 2;
      tank.bodyAngle = this.terrain.getSlopeAngle(position.x);
    }
    for (const decor of this.world.decors) {
      if (decor.destroyed) continue;
      const currentY = this.terrain.getSurfaceY(decor.x);
      if (Math.abs(currentY - decor.y) > 12) {
        decor.destroyed = true;
      } else {
        decor.y = currentY;
        decor.rotation = this.terrain.getSlopeAngle(decor.x);
      }
    }
  }

  private updateWinner(): void {
    if (this.world.match.phase === "gameOver") return;
    const aliveTanks = [...this.world.tanks.values()].filter(
      (tank) => tank.alive,
    );
    if (aliveTanks.length === 1) {
      this.world.match.winnerPlayerId = aliveTanks[0]?.playerId ?? null;
      this.world.match.phase = "gameOver";
    }
  }

  private handleMatchTimeout(): void {
    this.world.match.phase = "gameOver";
    const tanksByPlayer = new Map<number, number>();
    for (const tank of this.world.tanks.values()) {
      const current = tanksByPlayer.get(tank.playerId) ?? 0;
      tanksByPlayer.set(tank.playerId, current + Math.max(0, tank.health));
    }
    const p0Hp = tanksByPlayer.get(0) ?? 0;
    const p1Hp = tanksByPlayer.get(1) ?? 0;
    if (p0Hp > p1Hp) {
      this.world.match.winnerPlayerId = 0;
    } else if (p1Hp > p0Hp) {
      this.world.match.winnerPlayerId = 1;
    } else {
      this.world.match.winnerPlayerId = null;
    }
  }

  private advanceTurn(): void {
    this.lastImpactX = null;
    for (let step = 1; step <= this.world.match.playerCount; step += 1) {
      const nextPlayerId =
        (this.world.match.activePlayerId + step) % this.world.match.playerCount;
      const nextTankEntityId =
        this.world.tankEntitiesByPlayer.get(nextPlayerId);
      const nextTank = nextTankEntityId
        ? this.world.tanks.get(nextTankEntityId)
        : null;
      if (nextTank?.alive) {
        this.world.match.activePlayerId = nextPlayerId;
        this.world.match.turnNumber += 1;
        this.world.match.turnTimeRemaining = this.content.world.turnDurationSeconds;
        const minWind = this.content.world.minWind;
        const maxWind = this.content.world.maxWind;
        this.world.match.wind =
          Math.round((minWind + Math.random() * (maxWind - minWind)) * 10) / 10;
        nextTank.fuel = nextTank.maxFuel;
        this.world.match.phase = "thinking";
        return;
      }
    }

    this.world.match.phase = "gameOver";
  }

  private updateTurnTimer(dt: number): boolean {
    this.world.match.turnTimeRemaining = Math.max(
      0,
      this.world.match.turnTimeRemaining - dt,
    );

    if (this.world.match.turnTimeRemaining > 0) return false;

    this.world.match.phase = "transition";
    return true;
  }

  private resolveProjectileDefinition(
    _tank: TankComponent,
    projectileSlotId: string,
  ): ProjectileDefinition | null {
    return this.content.projectiles[projectileSlotId] ?? null;
  }

  private updateImpactEvents(dt: number): void {
    for (const [id, event] of this.world.impactEvents) {
      event.age += dt;
      if (event.age >= event.duration) {
        this.world.impactEvents.delete(id);
      }
    }
  }

  private spawnLootCrate(): void {
    const crateConfig = this.content.world.lootCrates;
    const edgeMargin = crateConfig?.spawnEdgeMargin ?? 100;
    const x = Math.floor(edgeMargin + Math.random() * (this.terrain.width - 2 * edgeMargin));
    const types: LootCrateType[] = ["hp", "fuel", "ammo"];
    const type = types[Math.floor(Math.random() * types.length)] ?? "hp";
    const targetY = this.terrain.getSurfaceY(x);
    const crateValue =
      type === "hp"
        ? (crateConfig?.hpValue ?? 25)
        : type === "fuel"
          ? (crateConfig?.fuelValue ?? 50)
          : (crateConfig?.ammoValue ?? 1);
    this.lootCrates.push({
      crateId: `crate-${Date.now()}-${Math.random()}`,
      crateType: type,
      x,
      y: -40,
      targetY,
      isLanding: true,
      collected: false,
      value: crateValue,
    });
  }

  private updateLootCrates(dt: number): void {
    const activeTankId = this.world.tankEntitiesByPlayer.get(this.world.match.activePlayerId);
    const activeTank = activeTankId ? this.world.tanks.get(activeTankId) : null;
    const activePos = activeTankId ? this.world.positions.get(activeTankId) : null;

    for (const crate of this.lootCrates) {
      crate.targetY = this.terrain.getSurfaceY(crate.x);
    }
    this.visualSim.updateLootCrates(dt, this.lootCrates);

    const remainingCrates: LootCrate[] = [];
    for (const crate of this.lootCrates) {
      if (crate.collected) continue;

      if (!crate.isLanding) {
        crate.y = crate.targetY;
      }

      if (activeTank && activePos && activeTank.alive) {
        const collectionRadius = this.content.world.lootCrates?.collectionRadius ?? 35.0;
        const dist = Math.hypot(
          crate.x - activePos.x,
          crate.y - 12 - activePos.y,
        );
        if (dist <= collectionRadius) {
          crate.collected = true;
          if (crate.crateType === "hp") {
            activeTank.health = Math.min(activeTank.maxHealth, activeTank.health + crate.value);
            this.spawnFloatingText(`+${crate.value} HP`, "#22c55e", activePos.x, activePos.y - 36);
          } else if (crate.crateType === "fuel") {
            activeTank.fuel = Math.min(activeTank.maxFuel, activeTank.fuel + crate.value);
            this.spawnFloatingText(`+${crate.value} Fuel`, "#f59e0b", activePos.x, activePos.y - 36);
          } else if (crate.crateType === "ammo") {
            const uniqueSlots = activeTank.loadout.filter((s) => s !== activeTank.loadout[0]);
            if (uniqueSlots.length > 0) {
              const slot = uniqueSlots[Math.floor(Math.random() * uniqueSlots.length)];
              if (slot && activeTank.weaponAmmo[slot] !== undefined) {
                activeTank.weaponAmmo[slot] = activeTank.weaponAmmo[slot] + crate.value;
              }
            }
            this.spawnFloatingText(`+${crate.value} Ammo`, "#a855f7", activePos.x, activePos.y - 36);
          }
        }
      }

      if (!crate.collected) {
        remainingCrates.push(crate);
      }
    }
    this.lootCrates = remainingCrates;
  }

  private spawnExplosionParticles(x: number, y: number, colors: readonly string[]): void {
    this.visualSim.spawnExplosionParticles(x, y, colors);
  }

  private spawnFloatingText(text: string, color: string, x: number, y: number): void {
    this.visualSim.spawnFloatingText(text, color, x, y);
  }
}

