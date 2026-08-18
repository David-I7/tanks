import type {
  OnlineGameStateSnapshotResponse,
  OnlineTerrainSnapshotResponse,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import { createInitialWeaponAmmo } from "../rendering/ResourceManager";
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

export function toGameState(
  confirmed: OnlineConfirmedState,
  renderState: OnlineGameStateSnapshotResponse,
  ctx: GameContext,
  visualState: ClientVisualState | null,
  flightState: { position: Vec2; velocity: Vec2 } | null,
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
  visualState: ClientVisualState | null,
  flightState: { position: Vec2; velocity: Vec2 } | null,
): GameState {
  const content = ctx.gameContent;

  return {
    match: {
      mode: "online",
      phase: visualState?.activeFlight ? "ballistics" : mapOnlinePhase(snapshot.match.phase),
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
      const weaponAmmo =
        tank.weaponAmmo ?? createInitialWeaponAmmo(tank.loadout);
      const visual: VisualIdentity = {
        fill: tank.visual.fillStyle,
        stroke: tank.visual.strokeStyle,
        accent: tank.visual.accentColor,
        label: tank.visual.label,
      };

      return {
        entityId: tank.entityId,
        playerId: tank.playerId,
        displayName: tank.displayName,
        controllerKind: tank.playerId === localPlayerId ? "human" : "remote",
        tankDefinitionId: tank.tankDefinitionId,
        tankName: content.tanks[tank.tankDefinitionId]?.name ?? tank.tankDefinitionId,
        width: tank.width,
        height: tank.height,
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
        maxFuel: tank.maxFuel ?? tank.fuel,
        fuel: tank.fuel,
        alive: tank.alive,
        position: {
          x: tank.position.x,
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
                ].name,
              power: DEFAULT_PROJECTILE_POWER,
              radius:
                content.projectiles[
                  visualState.activeFlight.projectileDefinitionId
                ].radius,
              physics: {
                radius:
                  content.projectiles[
                    visualState.activeFlight.projectileDefinitionId
                  ].radius,
                gravityScale:
                  content.projectiles[
                    visualState.activeFlight.projectileDefinitionId
                  ].gravityScale,
                drag:
                  content.projectiles[
                    visualState.activeFlight.projectileDefinitionId
                  ].drag,
                muzzleVelocityScale: 1,
              },
              terrainEffect:
                content.projectiles[
                  visualState.activeFlight.projectileDefinitionId
                ].terrainEffectType === "DRILL"
                  ? {
                      type: "drill",
                      radius:
                        content.projectiles[
                          visualState.activeFlight.projectileDefinitionId
                        ].terrainRadius,
                      depth:
                        content.projectiles[
                          visualState.activeFlight.projectileDefinitionId
                        ].terrainDepth,
                    }
                  : {
                      type: "crater",
                      radius:
                        content.projectiles[
                          visualState.activeFlight.projectileDefinitionId
                        ].terrainRadius,
                    },
              damageEffect:
                content.projectiles[
                  visualState.activeFlight.projectileDefinitionId
                ].damageEffectType === "FOCUSED"
                  ? {
                      type: "focused",
                      radius:
                        content.projectiles[
                          visualState.activeFlight.projectileDefinitionId
                        ].damageRadius,
                      damage:
                        content.projectiles[
                          visualState.activeFlight.projectileDefinitionId
                        ].damage,
                    }
                  : {
                      type: "radial",
                      radius:
                        content.projectiles[
                          visualState.activeFlight.projectileDefinitionId
                        ].damageRadius,
                      damage:
                        content.projectiles[
                          visualState.activeFlight.projectileDefinitionId
                        ].damage,
                    },
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
              name: definition.name,
              power: DEFAULT_PROJECTILE_POWER,
              radius: definition.radius,
              physics: {
                radius: definition.radius,
                gravityScale: definition.gravityScale,
                drag: definition.drag,
                muzzleVelocityScale: 1,
              },
              terrainEffect:
                definition.terrainEffectType === "DRILL"
                  ? {
                      type: "drill",
                      radius: definition.terrainRadius,
                      depth: definition.terrainDepth,
                    }
                  : {
                      type: "crater",
                      radius: definition.terrainRadius,
                    },
              damageEffect:
                definition.damageEffectType === "FOCUSED"
                  ? {
                      type: "focused",
                      radius: definition.damageRadius,
                      damage: definition.damage,
                    }
                  : {
                      type: "radial",
                      radius: definition.damageRadius,
                      damage: definition.damage,
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
    decors: visualState?.decors ?? [],
    clouds: visualState?.clouds ?? [],
  };
}

function mapOnlineImpactEvents(
  events: OnlineImpactProjectionEvent[],
  ctx: GameContext,
): ImpactEvent[] {
  const monotonicNowMs = ctx.clock();
  const results: ImpactEvent[] = [];
  for (const event of events) {
    const age = Math.max(0, (monotonicNowMs - event.createdAtMonotonicMs) / 1000);
    if (age < DEFAULT_IMPACT_DURATION_SECONDS) {
      const projDef = ctx.gameContent.projectiles[event.projectileDefinitionId];
      results.push({
        id: event.id,
        position: { ...event.position },
        animationId: event.animationId,
        age,
        duration: DEFAULT_IMPACT_DURATION_SECONDS,
        visual: {
          fill: "#ff4500",
          stroke: "#ff8c00",
          accent: "#ffd700",
          label: projDef ? projDef.label : "!",
        },
      });
    }
  }
  return results;
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
  return {
    kind: "heightmap",
    width: terrain.surface.length,
    height: terrain.height,
    surface: terrain.surface,
  };
}

function mapOnlineLootCrates(
  snapshot: OnlineGameStateSnapshotResponse,
): LootCrate[] {
  if (!snapshot.lootCrates) return [];
  return snapshot.lootCrates.map((crate) => {
    return {
      crateId: crate.crateId,
      crateType: crate.crateType,
      x: crate.x,
      y: !crate.isLanding ? crate.targetY : crate.y,
      targetY: crate.targetY,
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
  tankWidth: number,
): number {
  if (!surface || surface.length === 0) return 0;
  const halfWidth = Math.max(1, Math.floor(tankWidth / 2));
  const leftX = Math.max(0, Math.min(surface.length - 1, Math.floor(x - halfWidth)));
  const rightX = Math.max(0, Math.min(surface.length - 1, Math.floor(x + halfWidth)));
  const leftY = surface[leftX] ?? 0;
  const rightY = surface[rightX] ?? 0;
  return Math.atan2(rightY - leftY, rightX - leftX);
}
