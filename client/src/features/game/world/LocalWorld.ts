import {
  type EntityId,
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
    projectiles: Record<string, ProjectileDefinition>,
  ): EntityId {
    const entityId = this.createEntity();
    this.positions.set(entityId, { x, y });
    const defaultSlot = tankDefinition.loadout[0];
    if (!defaultSlot) {
      throw new Error(
        `Tank definition "${tankDefinition.id}" has no loadout slots`,
      );
    }
    const weaponAmmo = createInitialWeaponAmmo(
      tankDefinition.loadout,
      projectiles,
    );
    this.tanks.set(entityId, {
      playerId: player.id,
      displayName: player.displayName,
      controllerKind: player.controllerKind,
      tankDefinitionId: tankDefinition.id,
      tankName: tankDefinition.name,
      width: tankDefinition.width,
      height: tankDefinition.height,
      barrelLength: tankDefinition.barrelLength,
      turretYOffset: tankDefinition.turretYOffset,
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
      radius: projectileDefinition.visual?.radius ?? 4.0,
      remainingBounces: projectileDefinition.bouncer
        ? Math.max(0, projectileDefinition.bouncer.bounceCount - 1)
        : 0,
      physics: {
        radius: projectileDefinition.visual?.radius ?? 4.0,
        gravityScale: projectileDefinition.gravityScale,
        muzzleVelocityScale: 1,
      },
      terrainEffect: {
        type:
          projectileDefinition.terrainEffect?.type?.toLowerCase() === "drill" ||
          (projectileDefinition as unknown as { terrainEffectType?: string }).terrainEffectType?.toLowerCase() === "drill"
            ? "drill"
            : "crater",
        radius:
          projectileDefinition.terrainEffect?.radius ??
          (projectileDefinition as unknown as { terrainRadius?: number }).terrainRadius ??
          30,
        depth:
          (projectileDefinition.terrainEffect && "depth" in projectileDefinition.terrainEffect
            ? (projectileDefinition.terrainEffect as { depth: number }).depth
            : (projectileDefinition as unknown as { terrainDepth?: number }).terrainDepth) ?? 0,
      },
      damageEffect: {
        type:
          projectileDefinition.damageEffect?.type?.toLowerCase() === "focused" ||
          (projectileDefinition as unknown as { damageEffectType?: string }).damageEffectType?.toLowerCase() === "focused"
            ? "focused"
            : "radial",
        radius:
          projectileDefinition.damageEffect?.radius ??
          (projectileDefinition as unknown as { damageRadius?: number }).damageRadius ??
          30,
        damage:
          projectileDefinition.damageEffect?.damage ??
          (projectileDefinition as unknown as { damage?: number }).damage ??
          0,
      },
      position: { x, y },
      velocity: { x: vx, y: vy },
    });
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
      },
    });
  }

  getActiveTankEntity(): EntityId | null {
    return this.tankEntitiesByPlayer.get(this.match.activePlayerId) ?? null;
  }
}
