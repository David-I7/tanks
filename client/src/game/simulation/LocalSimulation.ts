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
    if (this.world.match.phase === "thinking") {
      if (this.updateTurnTimer(dt)) return;
    }

    this.updatePendingProjectiles(dt);
    this.updateDamageTrails(dt);

    if (this.world.match.phase === "ballistics") {
      this.updateProjectiles(dt);
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
    };
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
            radius: 25,
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
        if (bounces < projectile.pattern.maxBounces) {
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
      tank.health = Math.max(
        0,
        tank.health - Math.ceil(damageEffect.damage * falloff),
      );
      tank.alive = tank.health > 0;
    }
  }

  private updateTankGrounding(): void {
    for (const [entityId, tank] of this.world.tanks) {
      const position = this.world.positions.get(entityId);
      if (!position || !tank.alive) continue;
      position.y = this.terrain.getSurfaceY(position.x);
      tank.bodyAngle = this.terrain.getSlopeAngle(position.x);
    }
  }

  private updateWinner(): void {
    const aliveTanks = [...this.world.tanks.values()].filter(
      (tank) => tank.alive,
    );
    if (aliveTanks.length === 1) {
      this.world.match.winnerPlayerId = aliveTanks[0]?.playerId ?? null;
      this.world.match.phase = "gameOver";
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

    const activeTankEntityId = this.world.getActiveTankEntity();
    const tank = activeTankEntityId
      ? this.world.tanks.get(activeTankEntityId)
      : null;
    const position = activeTankEntityId
      ? this.world.positions.get(activeTankEntityId)
      : null;

    if (!tank || !position || !tank.alive) {
      this.world.match.phase = "transition";
      return true;
    }

    const projectileDefinition = this.resolveProjectileDefinition(
      tank,
      tank.selectedProjectileSlotId,
    );
    if (!projectileDefinition) {
      this.world.match.phase = "transition";
      return true;
    }
    this.fireWeaponPattern(tank, projectileDefinition, position.x, position.y);
    this.world.match.phase = "ballistics";
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
