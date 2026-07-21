import {
  type EntityId,
  type LifetimeComponent,
  type MatchState,
  type PositionComponent,
  type ProjectileDefinition,
  type ProjectileComponent,
  type TankComponent,
  type TankDefinition,
  type MatchSetupPlayer,
  type ImpactEvent,
  type VelocityComponent,
} from "../types";

export class World {
  private nextEntityId = 1;
  readonly positions = new Map<EntityId, PositionComponent>();
  readonly velocities = new Map<EntityId, VelocityComponent>();
  readonly tanks = new Map<EntityId, TankComponent>();
  readonly projectiles = new Map<EntityId, ProjectileComponent>();
  readonly lifetimes = new Map<EntityId, LifetimeComponent>();
  readonly impactEvents = new Map<number, ImpactEvent>();

  readonly tankEntitiesByPlayer = new Map<number, EntityId>();
  private nextImpactEventId = 1;

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

  createTank(
    player: MatchSetupPlayer,
    tankDefinition: TankDefinition,
    x: number,
    y: number,
  ): EntityId {
    const entityId = this.createEntity();
    this.positions.set(entityId, { x, y });
    const defaultSlot = tankDefinition.loadout[0]!;
    this.tanks.set(entityId, {
      playerId: player.id,
      displayName: player.displayName,
      controllerKind: player.controllerKind,
      tankDefinitionId: tankDefinition.id,
      tankName: tankDefinition.name,
      loadout: tankDefinition.loadout.map((slot) => ({ ...slot })),
      selectedProjectileSlotId: defaultSlot.id,
      maxHealth: tankDefinition.maxHealth,
      health: tankDefinition.maxHealth,
      facing: player.id === 0 ? 1 : -1,
      bodyAngle: 0,
      aimAngle: player.id === 0 ? -Math.PI / 4 : -Math.PI * 0.75,
      power: 360,
      maxFuel: tankDefinition.maxFuel,
      fuel: tankDefinition.maxFuel,
      alive: true,
    });
    this.tankEntitiesByPlayer.set(player.id, entityId);
    return entityId;
  }

  createProjectile(
    ownerPlayerId: number,
    projectileDefinition: ProjectileDefinition,
    power: number,
    x: number,
    y: number,
    vx: number,
    vy: number,
  ): EntityId {
    const entityId = this.createEntity();
    this.positions.set(entityId, { x, y });
    this.velocities.set(entityId, { x: vx, y: vy });
    this.projectiles.set(entityId, {
      ownerPlayerId,
      projectileDefinitionId: projectileDefinition.id,
      name: projectileDefinition.name,
      power,
      radius: projectileDefinition.physics.radius,
      physics: { ...projectileDefinition.physics },
      terrainEffect: { ...projectileDefinition.terrainEffect },
      damageEffect: { ...projectileDefinition.damageEffect },
      impactAnimationId: projectileDefinition.impactAnimationId,
      impactDuration: projectileDefinition.impactDuration,
      visual: { ...projectileDefinition.visual },
    });
    this.lifetimes.set(entityId, { active: true });
    return entityId;
  }

  createImpactEvent(
    x: number,
    y: number,
    projectile: ProjectileComponent,
  ): void {
    const id = this.nextImpactEventId;
    this.nextImpactEventId += 1;
    this.impactEvents.set(id, {
      id,
      position: { x, y },
      animationId: projectile.impactAnimationId,
      age: 0,
      duration: projectile.impactDuration,
      visual: { ...projectile.visual },
    });
  }

  getActiveTankEntity(): EntityId | null {
    return this.tankEntitiesByPlayer.get(this.match.activePlayerId) ?? null;
  }
}
