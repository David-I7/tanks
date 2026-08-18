import type { GameContentResponseDto } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { GameContent } from "../types";

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
      projectileTimeStepSeconds: response.world.deltaTime,
      maxProjectileSteps: response.world.maxProjectileSteps,
      movementSegmentDurationTicks: response.world.movementSegmentDurationTicks,
      playerASpawnRegion: {
        minX: response.world.playerASpawnRegion.minX,
        maxX: response.world.playerASpawnRegion.maxX,
      },
      playerBSpawnRegion: {
        minX: response.world.playerBSpawnRegion.minX,
        maxX: response.world.playerBSpawnRegion.maxX,
      },
      minWind: response.world.minWind,
      maxWind: response.world.maxWind,
      turnDurationSeconds: response.world.turnDurationSeconds ?? 30,
      matchDurationSeconds: response.world.matchDurationSeconds ?? 180,
      postImpactDelaySeconds: response.world.postImpactDelaySeconds ?? 0.55,
      lootCrates: response.world.lootCrates
        ? {
            hpValue: response.world.lootCrates.hpValue,
            fuelValue: response.world.lootCrates.fuelValue,
            ammoValue: response.world.lootCrates.ammoValue,
            collectionRadius: response.world.lootCrates.collectionRadius,
            dropSpeed: response.world.lootCrates.dropSpeed,
            spawnScheduleSeconds: [
              ...response.world.lootCrates.spawnScheduleSeconds,
            ],
            spawnEdgeMargin: response.world.lootCrates.spawnEdgeMargin,
            maxActiveCrates: response.world.lootCrates.maxActiveCrates,
          }
        : {
            hpValue: 25,
            fuelValue: 50,
            ammoValue: 1,
            collectionRadius: 35.0,
            dropSpeed: 150.0,
            spawnScheduleSeconds: [120, 60, 30],
            spawnEdgeMargin: 100.0,
            maxActiveCrates: 3,
          },
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
          barrelLength: tank.barrelLength ?? 28.0,
          turretYOffset: tank.turretYOffset ?? -14.0,
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
    validation: response.validation,
  };
}
