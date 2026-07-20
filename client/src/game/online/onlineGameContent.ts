import type { GameContentResponseDto } from "../../api/ws/dto/gameplay/OnlineGameplayProtocol";
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
      bedrockDepth: response.world.bedrockDepth,
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
    "tank.specter": {
      fill: "#60a5fa",
      stroke: "#1e3a8a",
      accent: "#dbeafe",
      label: "S",
    },
    "projectile.basic-shell": {
      fill: "#f8fafc",
      stroke: "#f97316",
      accent: "#fed7aa",
      label: "S",
    },
    "projectile.mortar": {
      fill: "#a3a3a3",
      stroke: "#404040",
      accent: "#e5e5e5",
      label: "M",
    },
    "projectile.heavy-shell": {
      fill: "#fca5a5",
      stroke: "#991b1b",
      accent: "#fee2e2",
      label: "H",
    },
    "projectile.cluster": {
      fill: "#fde047",
      stroke: "#854d0e",
      accent: "#fef9c3",
      label: "C",
    },
    "projectile.needle": {
      fill: "#93c5fd",
      stroke: "#1e40af",
      accent: "#dbeafe",
      label: "N",
    },
  };
  const visual = known[renderAssetId];
  if (!visual) throw new Error(`Unsupported Render Asset ID: ${renderAssetId}`);
  return visual;
}
