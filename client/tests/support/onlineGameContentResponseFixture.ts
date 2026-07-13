import type { GameContentResponseDto } from "../../src/api/ws/dto/gameplay/onlineGameplayProtocol";

export const onlineGameContentResponseFixture: GameContentResponseDto = {
  version: "game-content.v1",
  world: {
    width: 960, height: 560, bedrockDepth: 40, tickRateHz: 30, gravity: 500,
    projectileTimeStepSeconds: 1 / 30, maxProjectileSteps: 180, movementSegmentDurationTicks: 6,
    playerASpawnRegion: { minX: 96, maxX: 320 }, playerBSpawnRegion: { minX: 640, maxX: 864 },
  },
  tanks: {
    vanguard: {
      id: "vanguard", name: "Vanguard", renderAssetId: "tank.vanguard", maxHealth: 110, maxFuel: 100,
      movementQuantum: 1, fuelRate: .001, climbCapability: 1000, collisionRadius: 32, halfWidth: 0,
      trackGroundOffset: 0, muzzleForwardOffset: 18, muzzleVerticalOffset: 24,
      loadout: [{ id: "standard", projectileDefinitionId: "basicShell", label: "Std", renderAssetId: "projectile-slot.standard" }],
    },
    specter: {
      id: "specter", name: "Specter", renderAssetId: "tank.specter", maxHealth: 94, maxFuel: 100,
      movementQuantum: 1, fuelRate: 1, climbCapability: 5, collisionRadius: 32, halfWidth: 0,
      trackGroundOffset: 0, muzzleForwardOffset: 18, muzzleVerticalOffset: 24, loadout: [],
    },
  },
  projectiles: {},
};
