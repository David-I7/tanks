import { World } from "../world/World";
import { TerrainModel } from "../terrain/TerrainModel";
import type {
  DamageEffect,
  EntityId,
  GameSnapshot,
  GameAction,
  ProjectileComponent,
  ProjectileDefinition,
  TankComponent,
  TerrainPatch,
} from "../types";
import type { GameContent } from "../content/mockGameContent";
import { getLocalControllerKind } from "../modes";
import { GRAVITY, getMuzzlePosition } from "./ballistics";
import { MAX_TANK_FUEL, MAX_TURN_SECONDS, MOVE_FUEL_COST } from "./turnRules";
import {
  createWorldStatePublisher,
  type WorldStateMessage,
} from "../world/worldStatePublisher";

const TANK_HALF_WIDTH = 22;
const TANK_MOVE_STEP = 2;

export class LocalSimulationAuthority {
  private transitionTimer = 0;
  private readonly listeners = new Set<(message: WorldStateMessage) => void>();
  private readonly publisher = createWorldStatePublisher("mock-game-content-v1");

  constructor(
    readonly world: World,
    readonly terrain: TerrainModel,
    readonly content: GameContent,
  ) {}

  submitPlayerAction(playerId: number, action: GameAction): boolean {
    if (
      this.world.match.phase !== "aiming" &&
      this.world.match.phase !== "thinking"
    ) {
      return false;
    }
    if (this.world.match.activePlayerId !== playerId) return false;

    const tankEntityId = this.world.tankEntitiesByPlayer.get(playerId);
    if (!tankEntityId) return false;

    const tank = this.world.tanks.get(tankEntityId);
    const position = this.world.positions.get(tankEntityId);
    if (!tank || !position || !tank.alive) return false;

    if (action.type === "move") {
      if (tank.fuel <= 0) return false;
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
      this.publishFrame();
      return true;
    }

    if (action.type === "selectProjectileSlot") {
      if (!this.resolveProjectileDefinition(tank, action.projectileSlotId)) {
        return false;
      }
      tank.selectedProjectileSlotId = action.projectileSlotId;
      this.publishFrame();
      return true;
    }

    tank.aimAngle = action.angle;
    tank.power = Math.max(120, Math.min(action.power, 680));

    if (action.type === "fire") {
      const projectileDefinition = this.resolveProjectileDefinition(
        tank,
        action.projectileSlotId,
      );
      if (!projectileDefinition) return false;
      tank.selectedProjectileSlotId = action.projectileSlotId;
      this.spawnProjectile(tank, projectileDefinition, position.x, position.y);
      this.world.match.phase = "ballistics";
      this.world.match.turnTimeRemaining = 0;
    }

    this.publishFrame();
    return true;
  }

  update(dt: number): void {
    if (
      this.world.match.phase === "aiming" ||
      this.world.match.phase === "thinking"
    ) {
      if (this.updateTurnTimer(dt)) return;
    }

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
    this.publishFrame();
  }

  subscribeMessages(listener: (message: WorldStateMessage) => void): () => void {
    this.listeners.add(listener);
    listener(this.publisher.publishSnapshot(this.snapshot()));
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.listeners.clear();
  }

  snapshot(): GameSnapshot {
    return {
      match: { ...this.world.match },
      terrain: this.terrain.snapshot(),
      projectileDefinitions: Object.fromEntries(
        Object.entries(this.content.projectiles).map(([id, definition]) => [
          id,
          {
            ...definition,
            physics: { ...definition.physics },
            terrainEffect: { ...definition.terrainEffect },
            damageEffect: { ...definition.damageEffect },
            visual: { ...definition.visual },
          },
        ]),
      ),
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
    };
  }

  private spawnProjectile(
    tank: TankComponent,
    projectileDefinition: ProjectileDefinition,
    tankX: number,
    tankY: number,
  ): void {
    const muzzle = getMuzzlePosition(tankX, tankY, tank.aimAngle);
    const speedScale = projectileDefinition.physics.muzzleVelocityScale;
    this.world.createProjectile(
      tank.playerId,
      projectileDefinition,
      tank.power,
      muzzle.x,
      muzzle.y,
      Math.cos(tank.aimAngle) * tank.power * speedScale,
      Math.sin(tank.aimAngle) * tank.power * speedScale,
    );
  }

  private updateProjectiles(dt: number): void {
    const projectiles = [...this.world.projectiles];

    for (const [entityId, projectile] of projectiles) {
      const position = this.world.positions.get(entityId);
      const velocity = this.world.velocities.get(entityId);
      if (!position || !velocity) continue;

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

      if (hitTankEntityId !== null || hitTerrain || outOfBounds) {
        if (!outOfBounds) {
          this.resolveImpact(position.x, position.y, projectile);
        }
        this.world.destroyEntity(entityId);
        this.world.match.phase =
          this.world.impactEvents.size > 0 ? "impact" : "transition";
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
    const patch = this.terrain.applyTerrainEffect(x, y, projectile.terrainEffect);
    this.publish(this.publisher.publishTerrainPatch(patch));
    this.world.createImpactEvent(x, y, projectile);
    this.applyDamageEffect(x, y, projectile.damageEffect);
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
        this.world.match.phase =
          getLocalControllerKind(this.world.match.mode, nextPlayerId) === "ai"
            ? "thinking"
            : "aiming";
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
    this.spawnProjectile(tank, projectileDefinition, position.x, position.y);
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

  private publishFrame(terrainPatches: TerrainPatch[] = []): void {
    this.publish(this.publisher.publishFrame(this.snapshot(), terrainPatches));
  }

  private publish(message: WorldStateMessage): void {
    for (const listener of this.listeners) {
      listener(message);
    }
  }
}
