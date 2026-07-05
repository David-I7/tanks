import type {
  EntityId,
  LifetimeComponent,
  MatchState,
  PositionComponent,
  ProjectileComponent,
  TankComponent,
  VelocityComponent,
} from "../types";
import { MAX_TANK_FUEL } from "../simulation/turnRules";

export class World {
  private nextEntityId = 1;
  readonly positions = new Map<EntityId, PositionComponent>();
  readonly velocities = new Map<EntityId, VelocityComponent>();
  readonly tanks = new Map<EntityId, TankComponent>();
  readonly projectiles = new Map<EntityId, ProjectileComponent>();
  readonly lifetimes = new Map<EntityId, LifetimeComponent>();

  readonly tankEntitiesByPlayer = new Map<number, EntityId>();

  constructor(public match: MatchState) {}

  createEntity(): EntityId {
    const entityId = this.nextEntityId;
    this.nextEntityId += 1;
    return entityId;
  }

  destroyEntity(entityId: EntityId): void {
    this.positions.delete(entityId);
    this.velocities.delete(entityId);
    this.tanks.delete(entityId);
    this.projectiles.delete(entityId);
    this.lifetimes.delete(entityId);

    for (const [playerId, tankEntityId] of this.tankEntitiesByPlayer) {
      if (tankEntityId === entityId) {
        this.tankEntitiesByPlayer.delete(playerId);
      }
    }
  }

  createTank(playerId: number, x: number, y: number): EntityId {
    const entityId = this.createEntity();
    this.positions.set(entityId, { x, y });
    this.tanks.set(entityId, {
      playerId,
      maxHealth: 100,
      health: 100,
      facing: playerId === 0 ? 1 : -1,
      bodyAngle: 0,
      aimAngle: playerId === 0 ? -Math.PI / 4 : -Math.PI * 0.75,
      power: 360,
      maxFuel: MAX_TANK_FUEL,
      fuel: MAX_TANK_FUEL,
      alive: true,
    });
    this.tankEntitiesByPlayer.set(playerId, entityId);
    return entityId;
  }

  createProjectile(ownerPlayerId: number, x: number, y: number, vx: number, vy: number): EntityId {
    const entityId = this.createEntity();
    this.positions.set(entityId, { x, y });
    this.velocities.set(entityId, { x: vx, y: vy });
    this.projectiles.set(entityId, {
      ownerPlayerId,
      radius: 4,
      blastRadius: 46,
      damage: 50,
    });
    this.lifetimes.set(entityId, { active: true });
    return entityId;
  }

  getActiveTankEntity(): EntityId | null {
    return this.tankEntitiesByPlayer.get(this.match.activePlayerId) ?? null;
  }
}
