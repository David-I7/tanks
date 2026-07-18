import type {
  OnlineGameStateSnapshotResponse,
  OnlineTerrainSnapshotResponse,
} from "../../api/ws/dto/gameplay/OnlineGameplayProtocol";
import { mockGameContent, type GameContent } from "../content/mockGameContent";
import type {
  GameState,
  ImpactEvent,
  TerrainSnapshot,
  TurnPhase,
  VisualIdentity,
} from "../types";
import type {
  OnlineConfirmedState,
  OnlineImpactProjectionEvent,
} from "./onlineConfirmedState";

const DEFAULT_TANK_BODY_ANGLE = 0;
const DEFAULT_PROJECTILE_POWER = 0;
const DEFAULT_PROJECTILE_RADIUS = 4;
const DEFAULT_IMPACT_DURATION_SECONDS = 0.4;

const fallbackVisual: VisualIdentity = {
  fill: "#94a3b8",
  stroke: "#334155",
  accent: "#e2e8f0",
  label: "?",
};

export function onlineConfirmedStateToGameState(
  confirmed: OnlineConfirmedState,
  renderState: OnlineGameStateSnapshotResponse,
  content: GameContent = mockGameContent,
  monotonicNowMs: number = performance.now(),
): GameState {
  return onlineSnapshotToGameState(
    renderState,
    content,
    confirmed.localPlayerId,
    confirmed.impactEvents,
    monotonicNowMs,
  );
}

export function onlineSnapshotToGameState(
  snapshot: OnlineGameStateSnapshotResponse,
  content: GameContent = mockGameContent,
  localPlayerId: number | null = null,
  impactEvents: OnlineImpactProjectionEvent[] = [],
  monotonicNowMs: number = performance.now(),
): GameState {
  return {
    match: {
      mode: "online",
      phase: mapOnlinePhase(snapshot.match.phase),
      activePlayerId: snapshot.match.activePlayerId,
      playerCount: snapshot.match.playerCount,
      turnNumber: snapshot.match.turnNumber,
      turnTimeRemaining:
        snapshot.match.turnTimeRemainingTicks / content.world.tickRateHz,
      winnerPlayerId: snapshot.match.winnerPlayerId,
    },
    terrain: mapOnlineTerrain(snapshot.terrain),
    projectileDefinitions: content.projectiles,
    tanks: snapshot.tanks.map((tank) => {
      const tankDefinition = content.tanks[tank.tankDefinitionId];
      return {
        entityId: tank.entityId,
        playerId: tank.playerId,
        displayName: tank.displayName,
        controllerKind: tank.playerId === localPlayerId ? "human" : "remote",
        tankDefinitionId: tank.tankDefinitionId,
        tankName: tankDefinition?.name ?? tank.tankDefinitionId,
        visual: tankDefinition?.visual ?? namedFallbackVisual(tank.displayName),
        loadout: tank.loadout.map((slot) => ({
          id: slot.id,
          projectileDefinitionId: slot.projectileDefinitionId,
          label: slot.label,
          renderAssetId: slot.renderAssetId,
        })),
        selectedProjectileSlotId: tank.selectedProjectileSlotId,
        maxHealth: tank.maxHealth,
        health: tank.health,
        facing: tank.facing,
        bodyAngle: DEFAULT_TANK_BODY_ANGLE,
        aimAngle: tank.aimAngle,
        power: tank.power,
        maxFuel: tankDefinition?.maxFuel ?? tank.fuel,
        fuel: tank.fuel,
        alive: tank.alive,
        position: { ...tank.position },
      };
    }),
    projectiles: snapshot.projectiles.map((projectile) => {
      const definition = content.projectiles[projectile.projectileDefinitionId];
      return {
        entityId: projectile.entityId,
        ownerPlayerId: projectile.ownerPlayerId,
        projectileDefinitionId: projectile.projectileDefinitionId,
        name: definition?.name ?? projectile.projectileDefinitionId,
        power: DEFAULT_PROJECTILE_POWER,
        radius: definition?.physics.radius ?? DEFAULT_PROJECTILE_RADIUS,
        physics: definition?.physics ?? {
          radius: DEFAULT_PROJECTILE_RADIUS,
          gravityScale: 1,
          drag: 0,
          muzzleVelocityScale: 1,
        },
        terrainEffect: definition?.terrainEffect ?? {
          type: "crater",
          radius: 24,
        },
        damageEffect: definition?.damageEffect ?? {
          type: "radial",
          radius: 24,
          damage: 20,
        },
        impactAnimationId: definition?.impactAnimationId ?? "online-impact",
        impactDuration:
          definition?.impactDuration ?? DEFAULT_IMPACT_DURATION_SECONDS,
        visual: definition?.visual ?? fallbackVisual,
        position: { ...projectile.position },
        velocity: { ...projectile.velocity },
      };
    }),
    impactEvents: mapOnlineImpactEvents(impactEvents, content, monotonicNowMs),
  };
}

function mapOnlineImpactEvents(
  events: OnlineImpactProjectionEvent[],
  content: GameContent,
  monotonicNowMs: number,
): ImpactEvent[] {
  return events.map((event) => {
    const definition = content.projectiles[event.projectileDefinitionId];
    return {
      id: event.id,
      position: { ...event.position },
      animationId: event.animationId,
      age: Math.max(0, (monotonicNowMs - event.createdAtMonotonicMs) / 1000),
      duration: definition?.impactDuration ?? DEFAULT_IMPACT_DURATION_SECONDS,
      visual: definition?.visual ?? fallbackVisual,
    };
  });
}

function mapOnlinePhase(
  phase: OnlineGameStateSnapshotResponse["match"]["phase"],
): TurnPhase {
  switch (phase) {
    case "AIMING":
      return "aiming";
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
    width: terrain.width,
    height: terrain.height,
    surface: [...terrain.surface],
  };
}

function namedFallbackVisual(displayName: string): VisualIdentity {
  return {
    ...fallbackVisual,
    label: displayName.slice(0, 1).toUpperCase(),
  };
}
