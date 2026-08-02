import type { GameContentResponseDto } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { GameContent } from "../content/localGameContent";
import type { VisualIdentity } from "../types";

export function onlineGameContentFromResponse(
  response: GameContentResponseDto,
): GameContent {
  return {
    version: response.version,
    world: {
      width: response.world.width,
      height: response.world.height,
      tickRateHz: response.world.tickRateHz,
      gravity: response.world.gravity,
      projectileTimeStepSeconds: response.world.projectileTimeStepSeconds,
      maxProjectileSteps: response.world.maxProjectileSteps,
      movementSegmentDurationTicks: response.world.movementSegmentDurationTicks,
    },
    tanks: Object.fromEntries(
      Object.entries(response.tanks).map(([id, tank]) => [
        id,
        {
          id: tank.id,
          name: tank.name,
          maxHealth: tank.maxHealth,
          maxFuel: tank.maxFuel,
          movementQuantum: tank.movementQuantum,
          fuelRate: tank.fuelRate,
          climbCapability: tank.climbCapability,
          collisionRadius: tank.collisionRadius,
          halfWidth: tank.halfWidth,
          trackGroundOffset: tank.trackGroundOffset,
          muzzleForwardOffset: tank.muzzleForwardOffset,
          muzzleVerticalOffset: tank.muzzleVerticalOffset,
          loadout: tank.loadout.map(
            ({ id: slotId, projectileDefinitionId, label, renderAssetId }) => ({
              id: slotId,
              projectileDefinitionId,
              label,
              renderAssetId,
            }),
          ),
          visual: visualFor(tank.renderAssetId),
        },
      ]),
    ),
    projectiles: Object.fromEntries(
      Object.entries(response.projectiles).map(([id, projectile]) => [
        id,
        {
          id: projectile.id,
          name: projectile.name,
          physics: {
            radius: projectile.radius,
            gravityScale: projectile.gravityScale,
            drag: projectile.drag,
            muzzleVelocityScale: projectile.muzzleVelocityScale,
          },
          terrainEffect:
            projectile.terrainEffectType === "CRATER"
              ? { type: "crater" as const, radius: projectile.terrainRadius }
              : {
                  type: "drill" as const,
                  radius: projectile.terrainRadius,
                  depth: projectile.terrainDepth,
                },
          damageEffect:
            projectile.damageEffectType === "RADIAL"
              ? {
                  type: "radial" as const,
                  radius: projectile.damageRadius,
                  damage: projectile.damage,
                }
              : {
                  type: "focused" as const,
                  radius: projectile.damageRadius,
                  damage: projectile.damage,
                },
          impactAnimationId: projectile.impactRenderAssetId,
          impactDuration: projectile.impactDuration,
          visual: visualFor(projectile.renderAssetId),
        },
      ]),
    ),
  };
}

function visualFor(renderAssetId: string): VisualIdentity {
  const known: Record<string, VisualIdentity> = {
    "tank.vanguard": {
      fill: "#22c55e",
      stroke: "#14532d",
      accent: "#bbf7d0",
      label: "V",
    },
    "tank.vanguard-cyber": {
      fill: "#06b6d4",
      stroke: "#155e75",
      accent: "#a5f3fc",
      label: "VC",
    },
    "tank.heavy-armor": {
      fill: "#ef4444",
      stroke: "#991b1b",
      accent: "#fca5a5",
      label: "HA",
    },
    "tank.desert-striker": {
      fill: "#eab308",
      stroke: "#854d0e",
      accent: "#fef08a",
      label: "DS",
    },
    "tank.specter": {
      fill: "#a855f7",
      stroke: "#581c87",
      accent: "#e9d5ff",
      label: "S",
    },
    "projectile.basic-shell": {
      fill: "#f8fafc",
      stroke: "#f97316",
      accent: "#fed7aa",
      label: "S",
    },
    "projectile.titan-shell": {
      fill: "#ef4444",
      stroke: "#991b1b",
      accent: "#fca5a5",
      label: "T",
    },
    "projectile.autocannon-stream": {
      fill: "#fbbf24",
      stroke: "#d97706",
      accent: "#fef08a",
      label: "A",
    },
    "projectile.siege-volley": {
      fill: "#38bdf8",
      stroke: "#0284c7",
      accent: "#bae6fd",
      label: "V",
    },
    "projectile.heavy-bounce": {
      fill: "#a855f7",
      stroke: "#7e22ce",
      accent: "#e9d5ff",
      label: "B",
    },
    "projectile.precision-laser": {
      fill: "#22c55e",
      stroke: "#15803d",
      accent: "#bbf7d0",
      label: "L",
    },
    "projectile.sandstorm-cluster": {
      fill: "#eab308",
      stroke: "#a16207",
      accent: "#fef08a",
      label: "C",
    },
    "projectile.scatter-shotgun": {
      fill: "#f59e0b",
      stroke: "#b45309",
      accent: "#fde68a",
      label: "S",
    },
    "projectile.thermal-hazard": {
      fill: "#ef4444",
      stroke: "#b91c1c",
      accent: "#fca5a5",
      label: "T",
    },
    "projectile.mortar": {
      fill: "#38bdf8",
      stroke: "#0284c7",
      accent: "#e5e5e5",
      label: "M",
    },
    "projectile.heavy-shell": {
      fill: "#06b6d4",
      stroke: "#0891b2",
      accent: "#fee2e2",
      label: "H",
    },
    "projectile.cluster": {
      fill: "#8b5cf6",
      stroke: "#6d28d9",
      accent: "#fef9c3",
      label: "C",
    },
    "projectile.needle": {
      fill: "#6366f1",
      stroke: "#4338ca",
      accent: "#dbeafe",
      label: "N",
    },
    "projectile.phantom-nuke": {
      fill: "#ec4899",
      stroke: "#be185d",
      accent: "#fbcfe8",
      label: "N",
    },
    "projectile.ghost-shotgun": {
      fill: "#d946ef",
      stroke: "#a21caf",
      accent: "#f5d0fe",
      label: "G",
    },
    "projectile.spectre-volley": {
      fill: "#f43f5e",
      stroke: "#be123c",
      accent: "#fecdd3",
      label: "V",
    },
    "projectile.toxic-trail": {
      fill: "#10b981",
      stroke: "#047857",
      accent: "#a7f3d0",
      label: "T",
    },
  };
  const visual = known[renderAssetId];
  if (!visual) throw new Error(`Unsupported Render Asset ID: ${renderAssetId}`);
  return visual;
}
