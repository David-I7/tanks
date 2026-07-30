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
  type Particle,
  type FloatingText,
  MAX_TANK_FUEL,
  MAX_TURN_SECONDS,
  MOVE_FUEL_COST,
  type GameMode,
} from "../types";
import type { GameContent } from "../content/localGameContent";
import { GRAVITY, getMuzzlePosition } from "./ballistics";

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
  private particles: Particle[] = [];
  private floatingTexts: FloatingText[] = [];
  private screenShake = 0;
  private cratesSpawned = { minute1: false, minute2: false, minute3: false };

  constructor(
    readonly world: LocalWorld,
    readonly terrain: LocalTerrainModel,
    readonly content: GameContent,
  ) {}

  submitPlayerAction(playerId: number, action: GameAction): boolean {
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

    tank.aimAngle = action.angle;
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
    this.updateParticles(dt);
    this.updateFloatingTexts(dt);

    for (const cloud of this.world.clouds) {
      cloud.x += cloud.speed;
      if (cloud.x > this.terrain.width + 100) {
        cloud.x = -100;
      }
    }

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
    return {
      match: { ...this.world.match },
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
      particles: this.particles.map((p) => ({ ...p })),
      floatingTexts: this.floatingTexts.map((ft) => ({ ...ft })),
      decors: this.world.decors.map((d) => ({ ...d })),
      clouds: this.world.clouds.map((c) => ({ ...c })),
    };
  }

  setCameraLocked(locked: boolean): void {
    this.world.match.isCameraLocked = locked;
  }

  panCamera(deltaX: number): void {
    this.world.match.isCameraLocked = false;
    this.world.match.cameraX = Math.max(
      0,
      Math.min(this.terrain.width - 800, (this.world.match.cameraX ?? 0) + deltaX),
    );
  }

  relockCamera(): void {
    this.world.match.isCameraLocked = true;
  }

  private fireWeaponPattern(
    tank: TankComponent,
    projectileDefinition: ProjectileDefinition,
    tankX: number,
    tankY: number,
  ): void {
    const pattern = projectileDefinition.pattern;
    if (pattern?.kind === "autocannon") {
      this.spawnProjectileWithAngle(
        tank.playerId,
        projectileDefinition,
        tank.power,
        tankX,
        tankY,
        tank.aimAngle,
      );
      for (let i = 1; i < pattern.count; i += 1) {
        this.pendingProjectiles.push({
          delayRemaining: i * pattern.delaySeconds,
          ownerPlayerId: tank.playerId,
          projectileDefinition,
          power: tank.power,
          tankX,
          tankY,
          aimAngle: tank.aimAngle,
        });
      }
    } else if (pattern?.kind === "volley") {
      const count = pattern.count;
      const spreadRad = (pattern.spreadAngleDegrees * Math.PI) / 180;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - (count - 1) / 2) * (spreadRad / (count - 1 || 1));
        const angle = tank.aimAngle + offset;
        if (i === 0) {
          this.spawnProjectileWithAngle(
            tank.playerId,
            projectileDefinition,
            tank.power,
            tankX,
            tankY,
            angle,
          );
        } else {
          this.pendingProjectiles.push({
            delayRemaining: i * pattern.delaySeconds,
            ownerPlayerId: tank.playerId,
            projectileDefinition,
            power: tank.power,
            tankX,
            tankY,
            aimAngle: angle,
          });
        }
      }
    } else if (pattern?.kind === "shotgun") {
      const count = pattern.count;
      const spreadRad = (pattern.spreadAngleDegrees * Math.PI) / 180;
      for (let i = 0; i < count; i += 1) {
        const offset = (i - (count - 1) / 2) * (spreadRad / (count - 1 || 1));
        this.spawnProjectileWithAngle(
          tank.playerId,
          projectileDefinition,
          tank.power,
          tankX,
          tankY,
          tank.aimAngle + offset,
        );
      }
    } else {
      this.spawnProjectileWithAngle(
        tank.playerId,
        projectileDefinition,
        tank.power,
        tankX,
        tankY,
        tank.aimAngle,
      );
    }
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
    const speedScale = projectileDefinition.physics.muzzleVelocityScale;
    this.world.createProjectile(
      ownerPlayerId,
      projectileDefinition,
      power,
      muzzle.x,
      muzzle.y,
      Math.cos(aimAngle) * power * speedScale,
      Math.sin(aimAngle) * power * speedScale,
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
        const dist = Math.hypot(pos.x - trail.x, pos.y - 18 - trail.y);
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

      if (
        projectile.pattern?.kind === "cluster" &&
        !projectile.hasSplit &&
        velocity.y >= 0
      ) {
        projectile.hasSplit = true;
        this.world.destroyEntity(entityId);
        const def =
          this.content.projectiles[projectile.projectileDefinitionId] ??
          projectile;
        const subDef: ProjectileDefinition = {
          ...def,
          physics: {
            ...def.physics,
            radius: Math.max(2, def.physics.radius - 1),
          },
          damageEffect: {
            type: "radial",
            radius:
              projectile.damageEffect.type === "radial"
                ? projectile.damageEffect.radius
                : 25,
            damage: Math.ceil(
              projectile.damageEffect.type === "radial"
                ? projectile.damageEffect.damage
                : 25,
            ),
          },
          pattern: { kind: "standard" },
        };
        this.world.createProjectile(
          projectile.ownerPlayerId,
          subDef,
          projectile.power,
          position.x - 10,
          position.y,
          velocity.x - 40,
          velocity.y + 10,
        );
        this.world.createProjectile(
          projectile.ownerPlayerId,
          subDef,
          projectile.power,
          position.x,
          position.y,
          velocity.x,
          velocity.y + 10,
        );
        this.world.createProjectile(
          projectile.ownerPlayerId,
          subDef,
          projectile.power,
          position.x + 10,
          position.y,
          velocity.x + 40,
          velocity.y + 10,
        );
        continue;
      }

      velocity.x *= Math.max(0, 1 - projectile.physics.drag * dt);
      velocity.y *= Math.max(0, 1 - projectile.physics.drag * dt);
      velocity.x += (this.world.match.wind ?? 0) * 14 * dt;
      velocity.y += GRAVITY * projectile.physics.gravityScale * dt;
      position.x += velocity.x * dt;
      position.y += velocity.y * dt;

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

      if (hitTerrain && projectile.pattern?.kind === "bouncing") {
        const bounces = projectile.bouncesCount ?? 0;
        if (bounces < projectile.pattern.maxBounces - 1) {
          const x = Math.max(
            1,
            Math.min(this.terrain.width - 2, Math.floor(position.x)),
          );
          const slope =
            (this.terrain.getSurfaceY(x + 1) -
              this.terrain.getSurfaceY(x - 1)) /
            2;
          const normLen = Math.hypot(slope, 1);
          const nx = -slope / normLen;
          const ny = -1 / normLen;
          const dot = velocity.x * nx + velocity.y * ny;
          velocity.x = (velocity.x - 2 * dot * nx) * 0.85;
          velocity.y = (velocity.y - 2 * dot * ny) * 0.85;
          position.y = this.terrain.getSurfaceY(x) - projectile.radius - 2;
          projectile.bouncesCount = bounces + 1;
          continue;
        }
      }

      if (hitTankEntityId !== null || hitTerrain || outOfBounds) {
        if (!outOfBounds) {
          this.resolveImpact(position.x, position.y, projectile);
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
      const dy = projectilePosition.y - (tankPosition.y - 20);
      if (Math.sqrt(dx * dx + dy * dy) <= 28 + projectile.radius) {
        return tankEntityId;
      }
    }

    return null;
  }

  private resolveImpact(
    x: number,
    y: number,
    projectile: ProjectileComponent,
  ): void {
    if (projectile.pattern?.kind === "laser") {
      const depthMultiplier = projectile.pattern.depthMultiplier;
      const effect =
        projectile.terrainEffect.type === "drill"
          ? {
              ...projectile.terrainEffect,
              depth: projectile.terrainEffect.depth * depthMultiplier,
            }
          : {
              type: "drill" as const,
              radius: projectile.radius * 3,
              depth: 50 * depthMultiplier,
            };
      this.terrain.applyTerrainEffect(x, y, effect);
    } else {
      this.terrain.applyTerrainEffect(x, y, projectile.terrainEffect);
    }

    this.world.createImpactEvent(x, y, projectile);
    this.applyDamageEffect(x, y, projectile.damageEffect);
    this.spawnExplosionParticles(x, y);
    this.screenShake = projectile.pattern?.kind === "nuke" ? 22 : 12;

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

    if (projectile.pattern?.kind === "damageTrail") {
      this.damageTrails.push({
        id: `hazard-${Date.now()}-${Math.random()}`,
        x,
        y,
        radius: projectile.pattern.radius,
        damagePerSecond: projectile.pattern.damagePerSecond,
        remainingDuration: projectile.pattern.durationSeconds,
        ownerPlayerId: projectile.ownerPlayerId,
      });
    }
  }

  private applyDamageEffect(
    x: number,
    y: number,
    damageEffect: DamageEffect,
  ): void {
    const damageRadius = damageEffect.radius;

    for (const [entityId, tank] of this.world.tanks) {
      if (!tank.alive) continue;
      const position = this.world.positions.get(entityId);
      if (!position) continue;

      const dx = x - position.x;
      const dy = y - (position.y - 18);
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance > damageRadius) continue;

      const falloff =
        damageEffect.type === "focused"
          ? Math.max(0, 1 - distance / damageRadius) ** 2
          : 1 - distance / damageRadius;
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
    tank: TankComponent,
    projectileSlotId: string,
  ): ProjectileDefinition | null {
    const slot = tank.loadout.find((entry) => entry.id === projectileSlotId);
    if (!slot) return null;
    return this.content.projectiles[slot.projectileDefinitionId] ?? null;
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
    const groundY = this.terrain.getSurfaceY(x);
    this.lootCrates.push({
      id: `crate-${Date.now()}-${Math.random()}`,
      type,
      x,
      y: -40,
      groundY,
      falling: true,
      collected: false,
      value: type === "hp" ? 35 : type === "fuel" ? 60 : 1,
    });
  }

  private updateLootCrates(dt: number): void {
    const activeTankId = this.world.tankEntitiesByPlayer.get(this.world.match.activePlayerId);
    const activeTank = activeTankId ? this.world.tanks.get(activeTankId) : null;
    const activePos = activeTankId ? this.world.positions.get(activeTankId) : null;

    const remainingCrates: LootCrate[] = [];
    for (const crate of this.lootCrates) {
      if (crate.collected) continue;

      crate.groundY = this.terrain.getSurfaceY(crate.x);
      const targetY = crate.groundY - 14;

      if (crate.falling) {
        crate.y += 50 * dt;
        if (crate.y >= targetY) {
          crate.y = targetY;
          crate.falling = false;
        }
      } else {
        crate.y = targetY;
      }

      if (activeTank && activePos && activeTank.alive) {
        const dist = Math.hypot(crate.x - activePos.x, crate.y - (activePos.y - 14));
        if (dist <= 36) {
          crate.collected = true;
          if (crate.type === "hp") {
            activeTank.health = Math.min(activeTank.maxHealth, activeTank.health + 35);
            this.spawnFloatingText("+35 HP", "#22c55e", activePos.x, activePos.y - 36);
          } else if (crate.type === "fuel") {
            activeTank.fuel = Math.min(activeTank.maxFuel, activeTank.fuel + 60);
            this.spawnFloatingText("+60 Fuel", "#f59e0b", activePos.x, activePos.y - 36);
          } else if (crate.type === "ammo") {
            const uniqueSlots = activeTank.loadout.filter((s) => s.id !== "standard" && s.projectileDefinitionId !== "basicShell");
            if (uniqueSlots.length > 0) {
              const slot = uniqueSlots[Math.floor(Math.random() * uniqueSlots.length)];
              if (slot) {
                activeTank.weaponAmmo[slot.id] = (activeTank.weaponAmmo[slot.id] ?? 1) + 1;
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
    const colors = ["#fbbf24", "#f97316", "#ef4444", "#78716c", "#44403c"];
    for (let i = 0; i < 18; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 160;
      this.particles.push({
        id: `particle-${Date.now()}-${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#fbbf24",
        size: 2 + Math.random() * 3,
        life: 1.0,
        maxLife: 1.0,
      });
    }
  }

  private updateParticles(dt: number): void {
    const next: Particle[] = [];
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
      if (p.life > 0) {
        next.push(p);
      }
    }
    this.particles = next;
  }

  private spawnFloatingText(text: string, color: string, x: number, y: number): void {
    this.floatingTexts.push({
      id: `text-${Date.now()}-${Math.random()}`,
      text,
      color,
      x,
      y,
      vy: -60,
      life: 1.0,
      maxLife: 1.0,
    });
  }

  private updateFloatingTexts(dt: number): void {
    const next: FloatingText[] = [];
    for (const ft of this.floatingTexts) {
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.life > 0) {
        next.push(ft);
      }
    }
    this.floatingTexts = next;
  }

  addTankAmmo(playerId: number, slotId: string, amount: number = 1): void {
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

export type LocalControllerKind = "human" | "ai";

export function getLocalControllerKind(
  mode: GameMode,
  activePlayerId: number,
): LocalControllerKind {
  if (mode === "playerVsAi") {
    return activePlayerId === 0 ? "human" : "ai";
  }

  return "human";
}
