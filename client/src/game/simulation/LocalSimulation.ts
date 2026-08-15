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
  MAX_TANK_FUEL,
  MAX_TURN_SECONDS,
  MOVE_FUEL_COST,
} from "../types";
import type { GameContent } from "../content/localGameContent";
import { GRAVITY, getMuzzlePosition, clampAimAngle } from "./ballistics";
import { ClientVisualSimulation } from "./ClientVisualSimulation";

const TANK_HALF_WIDTH = 22;
const TANK_MOVE_STEP = 2;

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
      const fuelSpend = Math.min(tank.fuel, MOVE_FUEL_COST);
      const moveDistance = TANK_MOVE_STEP * (fuelSpend / MOVE_FUEL_COST);
      position.x = Math.max(
        TANK_HALF_WIDTH,
        Math.min(
          this.terrain.width - TANK_HALF_WIDTH,
          position.x + action.direction * moveDistance,
        ),
      );
      tank.fuel -= fuelSpend;
      position.y = this.terrain.getSurfaceY(position.x);
      tank.bodyAngle = this.terrain.getSlopeAngle(position.x);
      return true;
    }

    if (action.type === "selectProjectileSlot") {
      if (!this.resolveProjectileDefinition(tank, action.projectileSlotId)) {
        return false;
      }
      tank.selectedProjectileSlotId = action.projectileSlotId;
      return true;
    }

    tank.aimAngle = clampAimAngle(action.angle);
    tank.power = Math.max(120, Math.min(action.power, 680));

    if (action.type === "fire") {
      const currentAmmo = tank.weaponAmmo[action.projectileSlotId] ?? -1;
      if (currentAmmo === 0) {
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

      if (
        this.world.match.matchTimeRemaining <= 120.001 &&
        !this.cratesSpawned.minute1
      ) {
        this.cratesSpawned.minute1 = true;
        this.spawnLootCrate();
      }
      if (
        this.world.match.matchTimeRemaining <= 60.001 &&
        !this.cratesSpawned.minute2
      ) {
        this.cratesSpawned.minute2 = true;
        this.spawnLootCrate();
      }
      if (
        this.world.match.matchTimeRemaining <= 30.001 &&
        !this.cratesSpawned.minute3
      ) {
        this.cratesSpawned.minute3 = true;
        this.spawnLootCrate();
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
    this.visualSim.updateCamera(dt, focusX, 960, this.terrain.width);

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
      if (this.transitionTimer >= 0.55) {
        this.transitionTimer = 0;
        this.advanceTurn();
      }
    }

    this.updateTankGrounding();
    this.updateWinner();
  }

  getState(): LocalSimulationState {
    const visState = this.visualSim.getState();
    return {
      match: {
        ...this.world.match,
        cameraX: visState.cameraX,
        isCameraLocked: visState.isCameraLocked,
      },
      terrain: this.terrain.snapshot(),
      tanks: [...this.world.tanks].map(([entityId, tank]) => ({
        entityId,
        position: { ...this.world.positions.get(entityId)! },
        tank: { ...tank },
      })),
      projectiles: [...this.world.projectiles].map(
        ([entityId, projectile]) => ({
          entityId,
          position: { ...this.world.positions.get(entityId)! },
          velocity: { ...this.world.velocities.get(entityId)! },
          projectile: { ...projectile },
        }),
      ),
      impactEvents: [...this.world.impactEvents.values()].map((event) => ({
        ...event,
        position: { ...event.position },
        visual: { ...event.visual },
      })),
      damageTrails: this.damageTrails.map((t) => ({ ...t })),
      lootCrates: this.lootCrates.map((c) => ({ ...c })),
      particles: visState.particles,
      floatingTexts: visState.floatingTexts,
      decors: this.world.decors.map((d) => ({ ...d })),
      clouds: visState.clouds,
    };
  }

  setCameraLocked(locked: boolean): void {
    if (locked) {
      this.visualSim.relockCamera();
    }
  }

  panCamera(deltaX: number, viewportWidth = 960): void {
    if (this.world.match.isCameraLocked !== false) {
      const activeTankEntityId = this.world.tankEntitiesByPlayer.get(
        this.world.match.activePlayerId,
      );
      const pos = activeTankEntityId
        ? this.world.positions.get(activeTankEntityId)
        : null;
      if (pos) {
        this.visualSim.setCameraPosition(pos.x - viewportWidth * 0.5, viewportWidth, this.terrain.width);
      }
    }

    this.visualSim.panCamera(deltaX, viewportWidth, this.terrain.width);
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
      this.visualSim.setCameraPosition(pos.x - 960 * 0.5, 960, this.terrain.width);
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
    );
  }

  private spawnProjectileWithAngle(
    ownerPlayerId: number,
    projectileDefinition: ProjectileDefinition,
    power: number,
    tankX: number,
    tankY: number,
    aimAngle: number,
  ): void {
    const muzzle = getMuzzlePosition(tankX, tankY, aimAngle);
    this.world.createProjectile(
      ownerPlayerId,
      projectileDefinition,
      power,
      muzzle.x,
      muzzle.y,
      Math.cos(aimAngle) * power,
      Math.sin(aimAngle) * power,
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

      velocity.x *= Math.max(0, 1 - projectile.physics.drag * dt);
      velocity.y *= Math.max(0, 1 - projectile.physics.drag * dt);
      velocity.x += (this.world.match.wind ?? 0) * dt;
      velocity.y += GRAVITY * projectile.physics.gravityScale * dt;
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
      const dy = projectilePosition.y - (tankPosition.y - 14);
      if (Math.hypot(dx, dy) <= (tank.width ? tank.width * 0.5 : 18) + projectile.radius) {
        return tankEntityId;
      }
    }

    return null;
  }

  private resolveImpact(
    x: number,
    y: number,
    projectile: ProjectileComponent,
    directHitTankEntityId: EntityId | null = null,
  ): void {
    this.lastImpactX = x;
    this.terrain.applyTerrainEffect(x, y, projectile.terrainEffect);
    this.world.createImpactEvent(x, y, projectile);
    this.applyDamageEffect(x, y, projectile.damageEffect, directHitTankEntityId);
    this.spawnExplosionParticles(x, y);
    this.screenShake = 12;

    const blastRadius = Math.max(
      30,
      projectile.terrainEffect.radius ?? projectile.damageEffect.radius ?? 35,
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
    directHitTankEntityId: EntityId | null = null,
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
      const dy = y - (position.y - 12);
      const distance = Math.hypot(dx, dy);
      const tankCollisionRadius = (tank.width ?? 32) * 0.5;
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
      position.y = this.terrain.getSurfaceY(position.x);
      tank.bodyAngle = this.terrain.getSlopeAngle(position.x);
    }
    for (const decor of this.world.decors) {
      decor.y = this.terrain.getSurfaceY(decor.x);
      decor.rotation = this.terrain.getSlopeAngle(decor.x);
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
        this.world.match.turnTimeRemaining = MAX_TURN_SECONDS;
        this.world.match.wind = Math.round((Math.random() * 14 - 7) * 10) / 10;
        nextTank.fuel = MAX_TANK_FUEL;
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
    const x = Math.floor(100 + Math.random() * (this.terrain.width - 200));
    const types: LootCrateType[] = ["hp", "fuel", "ammo"];
    const type = types[Math.floor(Math.random() * types.length)] ?? "hp";
    const targetY = this.terrain.getSurfaceY(x);
    this.lootCrates.push({
      crateId: `crate-${Date.now()}-${Math.random()}`,
      crateType: type,
      x,
      y: -40,
      targetY,
      isLanding: true,
      collected: false,
      value: type === "hp" ? 35 : type === "fuel" ? 60 : 1,
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
        crate.y = crate.targetY - 14;
      }

      if (activeTank && activePos && activeTank.alive) {
        const dist = Math.hypot(crate.x - activePos.x, crate.y - (activePos.y - 14));
        if (dist <= 36) {
          crate.collected = true;
          if (crate.crateType === "hp") {
            activeTank.health = Math.min(activeTank.maxHealth, activeTank.health + 35);
            this.spawnFloatingText("+35 HP", "#22c55e", activePos.x, activePos.y - 36);
          } else if (crate.crateType === "fuel") {
            activeTank.fuel = Math.min(activeTank.maxFuel, activeTank.fuel + 60);
            this.spawnFloatingText("+60 Fuel", "#f59e0b", activePos.x, activePos.y - 36);
          } else if (crate.crateType === "ammo") {
            const uniqueSlots = activeTank.loadout.filter((s) => s !== "basicShell");
            if (uniqueSlots.length > 0) {
              const slot = uniqueSlots[Math.floor(Math.random() * uniqueSlots.length)];
              if (slot) {
                activeTank.weaponAmmo[slot] = (activeTank.weaponAmmo[slot] ?? 1) + 1;
              }
            }
            this.spawnFloatingText("+1 Ammo", "#a855f7", activePos.x, activePos.y - 36);
          }
        }
      }

      if (!crate.collected) {
        remainingCrates.push(crate);
      }
    }
    this.lootCrates = remainingCrates;
  }

  private spawnExplosionParticles(x: number, y: number): void {
    this.visualSim.spawnExplosionParticles(x, y);
  }

  private spawnFloatingText(text: string, color: string, x: number, y: number): void {
    this.visualSim.spawnFloatingText(text, color, x, y);
  }

  addTankAmmo(playerId: number, slotId: string, amount = 1): void {
    const entityId = this.world.tankEntitiesByPlayer.get(playerId);
    if (!entityId) return;
    const tank = this.world.tanks.get(entityId);
    if (!tank) return;
    const current = tank.weaponAmmo[slotId];
    if (current !== undefined && current !== -1) {
      tank.weaponAmmo[slotId] = current + amount;
    }
  }
}

