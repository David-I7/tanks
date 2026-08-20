import type { GameContentResponseDto } from "../../api/ws/dto/gameplay/onlineGameplayProtocol";
import type { GameContent } from "../types";

export function onlineGameContentFromResponse(
  response: GameContentResponseDto,
): GameContent {
  return {
    version: response.version,
    world: {
      biomes: response.world.biomes,
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
      turnDurationSeconds: response.world.turnDurationSeconds,
      matchDurationSeconds: response.world.matchDurationSeconds,
      postImpactDelaySeconds: response.world.postImpactDelaySeconds,
      lootCrates: {
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
          barrelLength: tank.barrelLength,
          turretYOffset: tank.turretYOffset,
          loadout: tank.loadout,
          visual: {
            fill: tank.visual.fillStyle,
            stroke: tank.visual.strokeStyle,
            accent: tank.visual.accentColor,
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
          description: projectile.description,
          intendedUse: projectile.intendedUse,
          visual: {
            radius: projectile.visual?.radius ?? 4.0,
            fill: projectile.visual?.fillStyle ?? "#475569",
            stroke: projectile.visual?.strokeStyle ?? "#38bdf8",
            accent: projectile.visual?.accentColor ?? "#f59e0b",
          },
          baseVelocity: projectile.baseVelocity,
          gravityScale: projectile.gravityScale,
          terrainEffectType: projectile.terrainEffectType,
          terrainRadius: projectile.terrainRadius,
          terrainDepth: projectile.terrainDepth,
          damageEffectType: projectile.damageEffectType,
          damageRadius: projectile.damageRadius,
          damage: projectile.damage,
          subMunitions: projectile.subMunitions,
          damageTrail: projectile.damageTrail,
          initialAmmo: projectile.initialAmmo,
          salvo: projectile.salvo ?? null,
          apexSplit: projectile.apexSplit ?? null,
          bouncer: projectile.bouncer ?? null,
        },
      ]),
    ),
    validation: response.validation,
  };
}
