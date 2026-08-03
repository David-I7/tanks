import type { GameContentResponseDto } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { GameContent } from "../content/localGameContent";

export function onlineGameContentFromResponse(
  response: GameContentResponseDto,
): GameContent {
  return {
    version: response.version,
    world: {
      biome: response.world.biome,
      width: response.world.width,
      height: response.world.height,
      tickRateHz: response.world.tickRateHz,
      gravity: response.world.gravity,
      projectileTimeStepSeconds: response.world.projectileTimeStepSeconds,
      maxProjectileSteps: response.world.maxProjectileSteps,
      movementSegmentDurationTicks: response.world.movementSegmentDurationTicks,
      minWind: response.world.minWind,
      maxWind: response.world.maxWind,
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
          width: tank.width,
          height: tank.height,
          loadout: tank.loadout,
          visual: {
            fill: tank.visual.fillStyle,
            stroke: tank.visual.strokeStyle,
            accent: tank.visual.accentColor,
            label: tank.visual.label,
          },
        },
      ]),
    ),
    projectiles: Object.fromEntries(
      Object.entries(response.projectiles).map(([id, projectile]) => [
        id,
        {
          id: projectile.id,
          name: projectile.name,
          label: projectile.label,
          radius: projectile.radius,
          baseVelocity: projectile.baseVelocity,
          gravityScale: projectile.gravityScale,
          drag: projectile.drag,
          terrainEffectType: projectile.terrainEffectType,
          terrainRadius: projectile.terrainRadius,
          terrainDepth: projectile.terrainDepth,
          damageEffectType: projectile.damageEffectType,
          damageRadius: projectile.damageRadius,
          damage: projectile.damage,
          subMunitions: projectile.subMunitions,
          damageTrail: projectile.damageTrail,
        },
      ]),
    ),
  };
}
