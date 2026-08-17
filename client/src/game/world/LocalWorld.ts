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
  type DecorObject,
  type Cloud,
} from "../types";
import { createInitialWeaponAmmo } from "../rendering/ResourceManager";

export class LocalWorld {
  private nextEntityId = 1;
  readonly positions = new Map<EntityId, PositionComponent>();
  readonly velocities = new Map<EntityId, VelocityComponent>();
  readonly tanks = new Map<EntityId, TankComponent>();
  readonly projectiles = new Map<EntityId, ProjectileComponent>();
  readonly lifetimes = new Map<EntityId, LifetimeComponent>();
  readonly impactEvents = new Map<number, ImpactEvent>();

  readonly tankEntitiesByPlayer = new Map<number, EntityId>();
  readonly decors: DecorObject[] = [];
  readonly clouds: Cloud[] = [];
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
    const defaultSlot = tankDefinition.loadout[0];
    if (!defaultSlot) {
      throw new Error(
        `Tank definition "${tankDefinition.id}" has no loadout slots`,
      );
    }
    const weaponAmmo = createInitialWeaponAmmo(tankDefinition.loadout);
    this.tanks.set(entityId, {
      playerId: player.id,
      displayName: player.displayName,
      controllerKind: player.controllerKind,
      tankDefinitionId: tankDefinition.id,
      tankName: tankDefinition.name,
      width: tankDefinition.width,
      height: tankDefinition.height,
      visual: { ...tankDefinition.visual },
      loadout: [...tankDefinition.loadout],
      selectedProjectileSlotId: defaultSlot,
      weaponAmmo,
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
      radius: projectileDefinition.radius,
      physics: {
        radius: projectileDefinition.radius,
        gravityScale: projectileDefinition.gravityScale,
        drag: projectileDefinition.drag,
        muzzleVelocityScale: 1,
      },
      terrainEffect:
        projectileDefinition.terrainEffectType === "DRILL"
          ? {
              type: "drill",
              radius: projectileDefinition.terrainRadius,
              depth: projectileDefinition.terrainDepth,
            }
          : { type: "crater", radius: projectileDefinition.terrainRadius },
      damageEffect:
        projectileDefinition.damageEffectType === "FOCUSED"
          ? {
              type: "focused",
              radius: projectileDefinition.damageRadius,
              damage: projectileDefinition.damage,
            }
          : {
              type: "radial",
              radius: projectileDefinition.damageRadius,
              damage: projectileDefinition.damage,
            },
      position: { x, y },
      velocity: { x: vx, y: vy },
    });
    this.lifetimes.set(entityId, { active: true });
    return entityId;
  }

  createImpactEvent(
    x: number,
    y: number,
    _projectile: ProjectileComponent,
  ): void {
    const id = this.nextImpactEventId;
    this.nextImpactEventId += 1;
    this.impactEvents.set(id, {
      id,
      position: { x, y },
      animationId: "orange-pop",
      age: 0,
      duration: 0.4,
      visual: {
        fill: "#f97316",
        stroke: "#c2410c",
        accent: "#fed7aa",
        label: "!",
      },
    });
  }

  getActiveTankEntity(): EntityId | null {
    return this.tankEntitiesByPlayer.get(this.match.activePlayerId) ?? null;
  }
}
