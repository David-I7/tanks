import type {
  OnlineGameStateSnapshotResponse,
  OnlineTerrainSnapshotResponse,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import { createInitialWeaponAmmo } from "../rendering/ResourceManager";
import { defaultWorldCoordinateMapper } from "./onlineWorldMapper";
import type { ClientVisualState } from "../simulation/ClientVisualSimulation";
import type {
  GameContext,
  GameState,
  ImpactEvent,
  LootCrate,
  DamageTrail,
  TerrainSnapshot,
  TurnPhase,
  VisualIdentity,
  Vec2,
} from "../types";
import type {
  OnlineConfirmedState,
  OnlineImpactProjectionEvent,
} from "./onlineConfirmedState";

const DEFAULT_PROJECTILE_POWER = 0;
const DEFAULT_IMPACT_DURATION_SECONDS = 0.4;

const fallbackVisual: VisualIdentity = {
  fill: "#94a3b8",
  stroke: "#334155",
  accent: "#e2e8f0",
  label: "?",
};

export function toGameState(
  confirmed: OnlineConfirmedState,
  renderState: OnlineGameStateSnapshotResponse,
  ctx: GameContext,
  visualState?: ClientVisualState,
  flightState?: { position: Vec2; velocity: Vec2 } | null,
): GameState {
  return onlineSnapshotToGameState(
    renderState,
    confirmed.localPlayerId,
    confirmed.impactEvents,
    ctx,
    visualState,
    flightState,
  );
}

export function onlineSnapshotToGameState(
  snapshot: OnlineGameStateSnapshotResponse,
  localPlayerId: number | null,
  impactEvents: OnlineImpactProjectionEvent[],
  ctx: GameContext,
  visualState?: ClientVisualState,
  flightState?: { position: Vec2; velocity: Vec2 } | null,
): GameState {
  const content = ctx.gameContent;

  return {
    match: {
      mode: "online",
      phase: mapOnlinePhase(snapshot.match.phase),
      activePlayerId: snapshot.match.activePlayerId,
      playerCount: snapshot.match.playerCount,
      turnNumber: snapshot.match.turnNumber,
      turnTimeRemaining:
        snapshot.match.turnTimeRemainingTicks / content.world.tickRateHz,
      matchTimeRemaining:
        snapshot.match.matchTimeRemainingTicks / content.world.tickRateHz,
      wind: snapshot.match.wind,
      winnerPlayerId: snapshot.match.winnerPlayerId,
      biome: snapshot.match.biome,
      isCameraLocked: visualState?.isCameraLocked ?? true,
      cameraX: visualState?.cameraX ?? 0,
    },
    terrain: mapOnlineTerrain(snapshot.terrain),
    projectileDefinitions: content.projectiles,
    tanks: snapshot.tanks.map((tank) => {
      const tankDefinition = content.tanks[tank.tankDefinitionId];
      const weaponAmmo = createInitialWeaponAmmo(tank.loadout);
      const visual: VisualIdentity = tank.visual
        ? {
            fill: tank.visual.fillStyle,
            stroke: tank.visual.strokeStyle,
            accent: tank.visual.accentColor,
            label: tank.visual.label,
          }
        : tankDefinition?.visual ?? namedFallbackVisual(tank.displayName);

      return {
        entityId: tank.entityId,
        playerId: tank.playerId,
        displayName: tank.displayName,
        controllerKind: tank.playerId === localPlayerId ? "human" : "remote",
        tankDefinitionId: tank.tankDefinitionId,
        tankName: tankDefinition?.name ?? tank.tankDefinitionId,
        width: tank.width ?? tankDefinition?.width ?? 32,
        height: tank.height ?? tankDefinition?.height ?? 24,
        visual,
        loadout: tank.loadout,
        selectedProjectileSlotId: tank.selectedProjectileSlotId,
        weaponAmmo,
        maxHealth: tank.maxHealth,
        health: tank.health,
        facing: tank.facing,
        bodyAngle: computeSlopeAngleFromSurface(
          snapshot.terrain.surface,
          tank.position.x,
          tank.width,
        ),
        aimAngle: tank.aimAngle,
        power: tank.power,
        maxFuel: tankDefinition?.maxFuel ?? tank.fuel,
        fuel: tank.fuel,
        alive: tank.alive,
        position: {
          x: defaultWorldCoordinateMapper.serverToClientX(tank.position.x),
          y: tank.position.y,
        },
      };
    }),
    projectiles:
      visualState?.activeFlight && flightState
        ? [
            {
              entityId: visualState.activeFlight.projectileEntityId,
              ownerPlayerId: visualState.activeFlight.ownerPlayerId,
              projectileDefinitionId:
                visualState.activeFlight.projectileDefinitionId,
              name:
                content.projectiles[
                  visualState.activeFlight.projectileDefinitionId
                ]?.name ?? visualState.activeFlight.projectileDefinitionId,
              power: DEFAULT_PROJECTILE_POWER,
              radius:
                content.projectiles[
                  visualState.activeFlight.projectileDefinitionId
                ]?.radius ?? 4,
              physics: {
                radius:
                  content.projectiles[
                    visualState.activeFlight.projectileDefinitionId
                  ]?.radius ?? 4,
                gravityScale:
                  content.projectiles[
                    visualState.activeFlight.projectileDefinitionId
                  ]?.gravityScale ?? 1,
                drag:
                  content.projectiles[
                    visualState.activeFlight.projectileDefinitionId
                  ]?.drag ?? 0,
                muzzleVelocityScale: 1,
              },
              terrainEffect: { type: "crater", radius: 24 },
              damageEffect: { type: "radial", radius: 24, damage: 20 },
              position: flightState.position,
              velocity: flightState.velocity,
            },
          ]
        : snapshot.projectiles.map((projectile) => {
            const definition = content.projectiles[projectile.projectileDefinitionId];
            return {
              entityId: projectile.entityId,
              ownerPlayerId: projectile.ownerPlayerId,
              projectileDefinitionId: projectile.projectileDefinitionId,
              name: definition?.name ?? projectile.projectileDefinitionId,
              power: DEFAULT_PROJECTILE_POWER,
              radius: definition?.radius ?? 4,
              physics: {
                radius: definition?.radius ?? 4,
                gravityScale: definition?.gravityScale ?? 1,
                drag: definition?.drag ?? 0,
                muzzleVelocityScale: 1,
              },
              terrainEffect:
                definition?.terrainEffectType === "DRILL"
                  ? {
                      type: "drill",
                      radius: definition.terrainRadius,
                      depth: definition.terrainDepth,
                    }
                  : {
                      type: "crater",
                      radius: definition?.terrainRadius ?? 24,
                    },
              damageEffect:
                definition?.damageEffectType === "FOCUSED"
                  ? {
                      type: "focused",
                      radius: definition.damageRadius,
                      damage: definition.damage,
                    }
                  : {
                      type: "radial",
                      radius: definition?.damageRadius ?? 24,
                      damage: definition?.damage ?? 20,
                    },
              position: { ...projectile.position },
              velocity: { ...projectile.velocity },
            };
          }),
    impactEvents: mapOnlineImpactEvents(impactEvents, ctx),
    lootCrates: mapOnlineLootCrates(snapshot),
    damageTrails: mapOnlineDamageTrails(snapshot),
    particles: visualState?.particles ?? [],
    floatingTexts: visualState?.floatingTexts ?? [],
    decors: [],
    clouds: visualState?.clouds ?? [],
  };
}

function mapOnlineImpactEvents(
  events: OnlineImpactProjectionEvent[],
  ctx: GameContext,
): ImpactEvent[] {
  const monotonicNowMs = ctx.clock();
  return events.map((event) => {
    return {
      id: event.id,
      position: { ...event.position },
      animationId: event.animationId,
      age: Math.max(0, (monotonicNowMs - event.createdAtMonotonicMs) / 1000),
      duration: DEFAULT_IMPACT_DURATION_SECONDS,
      visual: fallbackVisual,
    };
  });
}

function mapOnlinePhase(
  phase: OnlineGameStateSnapshotResponse["match"]["phase"],
): TurnPhase {
  switch (phase) {
    case "AIMING":
      return "thinking";
    case "BALLISTICS":
      return "ballistics";
    case "IMPACT":
      return "impact";
    case "TRANSITION":
      return "transition";
    case "GAME_OVER":
      return "gameOver";
  }
}

function mapOnlineTerrain(
  terrain: OnlineTerrainSnapshotResponse,
): TerrainSnapshot {
  const mapped = defaultWorldCoordinateMapper.mapSurface(terrain.surface);
  return {
    kind: "heightmap",
    width: mapped.width,
    height: terrain.height,
    surface: mapped.surface,
  };
}

function namedFallbackVisual(displayName: string): VisualIdentity {
  return {
    ...fallbackVisual,
    label: displayName.slice(0, 1).toUpperCase(),
  };
}

function mapOnlineLootCrates(
  snapshot: OnlineGameStateSnapshotResponse,
): LootCrate[] {
  if (!snapshot.lootCrates) return [];
  return snapshot.lootCrates.map((crate) => {
    const targetY = crate.targetY - 12;
    return {
      crateId: crate.crateId,
      crateType: crate.crateType,
      x: crate.x,
      y: !crate.isLanding ? targetY : crate.y,
      targetY: targetY,
      isLanding: crate.isLanding,
      collected: crate.collected,
      value: crate.value,
    };
  });
}

function mapOnlineDamageTrails(
  snapshot: OnlineGameStateSnapshotResponse,
): DamageTrail[] {
  if (!snapshot.damageTrails) return [];
  return snapshot.damageTrails.map((trail) => ({
    id: trail.id,
    position: { ...trail.position },
    radius: trail.radius,
    damagePerSecond: trail.damagePerSecond,
    remainingDuration: trail.durationSeconds,
    ownerPlayerId: trail.ownerPlayerId,
  }));
}

function computeSlopeAngleFromSurface(
  surface: number[],
  x: number,
  tankWidth: number = 32,
): number {
  if (!surface || surface.length === 0) return 0;
  const halfWidth = Math.max(1, Math.floor(tankWidth / 2));
  const leftX = Math.max(0, Math.min(surface.length - 1, Math.floor(x - halfWidth)));
  const rightX = Math.max(0, Math.min(surface.length - 1, Math.floor(x + halfWidth)));
  const leftY = surface[leftX] ?? 0;
  const rightY = surface[rightX] ?? 0;
  return Math.atan2(rightY - leftY, rightX - leftX);
}
