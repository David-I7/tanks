import type { ProjectileDefinition, TankDefinition } from "../types";

export type GameContent = {
  version: string;
  world: {
    width: number;
    height: number;
    bedrockDepth: number;
    tickRateHz: number;
    gravity: number;
    projectileTimeStepSeconds: number;
    maxProjectileSteps: number;
    movementSegmentDurationTicks: number;
  };
  tanks: Record<string, TankDefinition>;
  projectiles: Record<string, ProjectileDefinition>;
};

export const localGameContent: GameContent = {
  version: "game-content.v1",
  world: {
    width: 1280,
    height: 720,
    bedrockDepth: 40,
    tickRateHz: 30,
    gravity: 500,
    projectileTimeStepSeconds: 1 / 30,
    maxProjectileSteps: 180,
    movementSegmentDurationTicks: 6,
  },
  projectiles: {
    basicShell: {
      id: "basicShell",
      name: "Basic Shell",
      physics: {
        radius: 4,
        gravityScale: 1,
        drag: 0,
        muzzleVelocityScale: 1,
      },
      terrainEffect: { type: "crater", radius: 46 },
      damageEffect: { type: "radial", radius: 46, damage: 48 },
      impactAnimationId: "orange-pop",
      impactDuration: 0.42,
    },
    mortar: {
      id: "mortar",
      name: "Mortar",
      physics: {
        radius: 5,
        gravityScale: 1.36,
        drag: 0.02,
        muzzleVelocityScale: 0.78,
      },
      terrainEffect: { type: "crater", radius: 64 },
      damageEffect: { type: "radial", radius: 62, damage: 38 },
      impactAnimationId: "smoke-ring",
      impactDuration: 0.58,
    },
    heavyShell: {
      id: "heavyShell",
      name: "Heavy Shell",
      physics: {
        radius: 7,
        gravityScale: 1.14,
        drag: 0.01,
        muzzleVelocityScale: 0.92,
      },
      terrainEffect: { type: "drill", radius: 38, depth: 42 },
      damageEffect: { type: "focused", radius: 34, damage: 72 },
      impactAnimationId: "red-slam",
      impactDuration: 0.5,
    },
    cluster: {
      id: "cluster",
      name: "Cluster",
      physics: {
        radius: 3,
        gravityScale: 0.92,
        drag: 0.035,
        muzzleVelocityScale: 1.12,
      },
      terrainEffect: { type: "crater", radius: 30 },
      damageEffect: { type: "radial", radius: 78, damage: 30 },
      impactAnimationId: "spark-burst",
      impactDuration: 0.48,
    },
    needle: {
      id: "needle",
      name: "Needle",
      physics: {
        radius: 2,
        gravityScale: 0.8,
        drag: 0,
        muzzleVelocityScale: 1.35,
      },
      terrainEffect: { type: "drill", radius: 16, depth: 56 },
      damageEffect: { type: "focused", radius: 22, damage: 58 },
      impactAnimationId: "blue-flash",
      impactDuration: 0.36,
    },
    // Heavy Armor signature projectile
    titanShell: {
      id: "titanShell",
      name: "Titan Shell",
      physics: {
        radius: 9,
        gravityScale: 1.25,
        drag: 0.015,
        muzzleVelocityScale: 0.88,
      },
      terrainEffect: { type: "crater", radius: 80 },
      damageEffect: { type: "radial", radius: 75, damage: 85 },
      impactAnimationId: "red-slam",
      impactDuration: 0.65,
    },
    // Desert Striker signature projectile
    precisionDart: {
      id: "precisionDart",
      name: "Precision Dart",
      physics: {
        radius: 3,
        gravityScale: 0.65,
        drag: 0.005,
        muzzleVelocityScale: 1.45,
      },
      terrainEffect: { type: "drill", radius: 20, depth: 70 },
      damageEffect: { type: "focused", radius: 25, damage: 65 },
      impactAnimationId: "spark-burst",
      impactDuration: 0.4,
    },
    // Vanguard Cyber signature projectile
    pulseRail: {
      id: "pulseRail",
      name: "Pulse Rail",
      physics: {
        radius: 5,
        gravityScale: 0.75,
        drag: 0,
        muzzleVelocityScale: 1.3,
      },
      terrainEffect: { type: "crater", radius: 52 },
      damageEffect: { type: "radial", radius: 50, damage: 60 },
      impactAnimationId: "blue-flash",
      impactDuration: 0.45,
    },
  },
  tanks: {
    "heavy-armor": {
      id: "heavy-armor",
      name: "Heavy Armor",
      maxHealth: 130,
      maxFuel: 180,
      movementQuantum: 6,
      fuelRate: 1.2,
      climbCapability: 4,
      collisionRadius: 36,
      halfWidth: 18,
      trackGroundOffset: 0,
      muzzleForwardOffset: 20,
      muzzleVerticalOffset: 24,
      loadout: [
        { id: "titan", projectileDefinitionId: "titanShell", label: "Ttn" },
        { id: "heavy", projectileDefinitionId: "heavyShell", label: "Hvy" },
        { id: "mortar", projectileDefinitionId: "mortar", label: "Mtr" },
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "cluster", projectileDefinitionId: "cluster", label: "Clu" },
      ],
    },
    "desert-striker": {
      id: "desert-striker",
      name: "Desert Striker",
      maxHealth: 95,
      maxFuel: 280,
      movementQuantum: 10,
      fuelRate: 0.8,
      climbCapability: 6,
      collisionRadius: 30,
      halfWidth: 15,
      trackGroundOffset: 0,
      muzzleForwardOffset: 22,
      muzzleVerticalOffset: 22,
      loadout: [
        {
          id: "precision",
          projectileDefinitionId: "precisionDart",
          label: "Prc",
        },
        { id: "needle", projectileDefinitionId: "needle", label: "Ndl" },
        { id: "cluster", projectileDefinitionId: "cluster", label: "Clu" },
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "mortar", projectileDefinitionId: "mortar", label: "Mtr" },
      ],
    },
    "vanguard-cyber": {
      id: "vanguard-cyber",
      name: "Vanguard Cyber",
      maxHealth: 110,
      maxFuel: 240,
      movementQuantum: 8,
      fuelRate: 1,
      climbCapability: 5,
      collisionRadius: 32,
      halfWidth: 16,
      trackGroundOffset: 0,
      muzzleForwardOffset: 18,
      muzzleVerticalOffset: 24,
      loadout: [
        { id: "rail", projectileDefinitionId: "pulseRail", label: "Rail" },
        { id: "needle", projectileDefinitionId: "needle", label: "Ndl" },
        { id: "heavy", projectileDefinitionId: "heavyShell", label: "Hvy" },
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "cluster", projectileDefinitionId: "cluster", label: "Clu" },
      ],
    },
    vanguard: {
      id: "vanguard",
      name: "Vanguard",
      maxHealth: 110,
      maxFuel: 240,
      movementQuantum: 8,
      fuelRate: 1,
      climbCapability: 5,
      collisionRadius: 32,
      halfWidth: 16,
      trackGroundOffset: 0,
      muzzleForwardOffset: 18,
      muzzleVerticalOffset: 24,
      loadout: [
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "mortar", projectileDefinitionId: "mortar", label: "Mtr" },
        { id: "heavy", projectileDefinitionId: "heavyShell", label: "Hvy" },
        { id: "cluster", projectileDefinitionId: "cluster", label: "Clu" },
        { id: "needle", projectileDefinitionId: "needle", label: "Ndl" },
      ],
    },
    specter: {
      id: "specter",
      name: "Specter",
      maxHealth: 94,
      maxFuel: 240,
      movementQuantum: 8,
      fuelRate: 1,
      climbCapability: 5,
      collisionRadius: 32,
      halfWidth: 16,
      trackGroundOffset: 0,
      muzzleForwardOffset: 18,
      muzzleVerticalOffset: 24,
      loadout: [
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "mortar", projectileDefinitionId: "mortar", label: "Mtr" },
        { id: "heavy", projectileDefinitionId: "heavyShell", label: "Hvy" },
        { id: "cluster", projectileDefinitionId: "cluster", label: "Clu" },
        { id: "needle", projectileDefinitionId: "needle", label: "Ndl" },
      ],
    },
  },
};
