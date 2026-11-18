export function createInitialWeaponAmmo(
  loadout: string[],
): Record<string, number> {
  const weaponAmmo: Record<string, number> = {};
  for (const slotId of loadout) {
    weaponAmmo[slotId] = slotId === "basicShell" || slotId === "standard" ? -1 : 1;
  }
  return weaponAmmo;
}

export type VisualIdentity = {
  fill: string;
  stroke: string;
  accent: string;
  label: string;
};

export type ProjectilePhysics = {
  radius: number;
  gravityScale: number;
  drag: number;
  muzzleVelocityScale: number;
};

export type TerrainEffect =
  | { type: "crater"; radius: number }
  | { type: "drill"; radius: number; depth: number };

export type DamageEffect =
  | { type: "radial"; radius: number; damage: number }
  | { type: "focused"; radius: number; damage: number };

export type SubMunitionConfig = {
  count: number;
  projectileDefinitionId: string;
  spreadAngleDegrees: number;
  velocityScale: number;
};

export type DamageTrailConfig = {
  radius: number;
  damagePerSecond: number;
  durationSeconds: number;
};

export type ProjectileDefinition = {
  id: string;
  name: string;
  label: string;
  radius: number;
  baseVelocity: number;
  gravityScale: number;
  drag: number;
  terrainEffectType: "CRATER" | "DRILL";
  terrainRadius: number;
  terrainDepth: number;
  damageEffectType: "RADIAL" | "FOCUSED";
  damageRadius: number;
  damage: number;
  subMunitions: SubMunitionConfig | null;
  damageTrail: DamageTrailConfig | null;
};

export type DomainTankDefinition = {
  id: string;
  name: string;
  maxHealth: number;
  maxFuel: number;
  movementQuantum: number;
  fuelRate: number;
  climbCapability: number;
  width: number;
  height: number;
  visual: VisualIdentity;
  loadout: string[];
};

export type GameContent = {
  version: string;
  world: {
    biome: "forest" | "desert" | "ice";
    width: number;
    height: number;
    tickRateHz: number;
    gravity: number;
    projectileTimeStepSeconds: number;
    maxProjectileSteps: number;
    movementSegmentDurationTicks: number;
    minWind: number;
    maxWind: number;
  };
  tanks: Record<string, DomainTankDefinition>;
  projectiles: Record<string, ProjectileDefinition>;
};

export const localGameContent: GameContent = {
  version: "game-content.v1",
  world: {
    biome: "forest",
    width: 1280,
    height: 720,
    tickRateHz: 30,
    gravity: 500,
    projectileTimeStepSeconds: 1 / 30,
    maxProjectileSteps: 180,
    movementSegmentDurationTicks: 6,
    minWind: -50,
    maxWind: 50,
  },
  projectiles: {
    basicShell: {
      id: "basicShell",
      name: "Basic Shell",
      label: "Std",
      radius: 4,
      baseVelocity: 600,
      gravityScale: 1,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 46,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 46,
      damage: 48,
      subMunitions: null,
      damageTrail: null,
    },
    titanShell: {
      id: "titanShell",
      name: "Titan Shell",
      label: "Ttn",
      radius: 9,
      baseVelocity: 550,
      gravityScale: 1.25,
      drag: 0.015,
      terrainEffectType: "CRATER",
      terrainRadius: 85,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 85,
      damage: 85,
      subMunitions: null,
      damageTrail: null,
    },
    autocannonStream: {
      id: "autocannonStream",
      name: "Autocannon Stream",
      label: "Auto",
      radius: 3,
      baseVelocity: 650,
      gravityScale: 0.9,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 25,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 25,
      damage: 20,
      subMunitions: null,
      damageTrail: null,
    },
    siegeVolley: {
      id: "siegeVolley",
      name: "Siege Volley",
      label: "Vly",
      radius: 4,
      baseVelocity: 600,
      gravityScale: 1.0,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 30,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 30,
      damage: 25,
      subMunitions: null,
      damageTrail: null,
    },
    heavyBounce: {
      id: "heavyBounce",
      name: "Heavy Bounce",
      label: "Bnc",
      radius: 5,
      baseVelocity: 580,
      gravityScale: 1.1,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 35,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 35,
      damage: 40,
      subMunitions: null,
      damageTrail: null,
    },
    precisionLaser: {
      id: "precisionLaser",
      name: "Plasma Penetrator",
      label: "Lsr",
      radius: 3,
      baseVelocity: 800,
      gravityScale: 0.6,
      drag: 0,
      terrainEffectType: "DRILL",
      terrainRadius: 35,
      terrainDepth: 70,
      damageEffectType: "FOCUSED",
      damageRadius: 35,
      damage: 65,
      subMunitions: null,
      damageTrail: null,
    },
    sandstormCluster: {
      id: "sandstormCluster",
      name: "Sandstorm Cluster",
      label: "Clu",
      radius: 4,
      baseVelocity: 600,
      gravityScale: 0.9,
      drag: 0.02,
      terrainEffectType: "CRATER",
      terrainRadius: 30,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 30,
      damage: 25,
      subMunitions: {
        count: 3,
        projectileDefinitionId: "basicShell",
        spreadAngleDegrees: 15,
        velocityScale: 0.8,
      },
      damageTrail: null,
    },
    scatterShotgun: {
      id: "scatterShotgun",
      name: "Turret Shotgun",
      label: "Sht",
      radius: 3,
      baseVelocity: 680,
      gravityScale: 1.0,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 20,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 20,
      damage: 18,
      subMunitions: null,
      damageTrail: null,
    },
    thermalHazard: {
      id: "thermalHazard",
      name: "Thermal Hazard",
      label: "Trl",
      radius: 5,
      baseVelocity: 600,
      gravityScale: 1.0,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 25,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 45,
      damage: 15,
      subMunitions: null,
      damageTrail: {
        radius: 45,
        damagePerSecond: 10,
        durationSeconds: 4,
      },
    },
    mortar: {
      id: "mortar",
      name: "Mortar Shell",
      label: "Mtr",
      radius: 5,
      baseVelocity: 550,
      gravityScale: 1.3,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 55,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 55,
      damage: 55,
      subMunitions: null,
      damageTrail: null,
    },
    heavyShell: {
      id: "heavyShell",
      name: "Heavy Kinetic Shell",
      label: "Hvy",
      radius: 6,
      baseVelocity: 580,
      gravityScale: 1.15,
      drag: 0.01,
      terrainEffectType: "CRATER",
      terrainRadius: 65,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 65,
      damage: 65,
      subMunitions: null,
      damageTrail: null,
    },
    cluster: {
      id: "cluster",
      name: "Cluster Bomb",
      label: "Cls",
      radius: 4,
      baseVelocity: 600,
      gravityScale: 1.0,
      drag: 0.02,
      terrainEffectType: "CRATER",
      terrainRadius: 30,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 30,
      damage: 25,
      subMunitions: {
        count: 4,
        projectileDefinitionId: "basicShell",
        spreadAngleDegrees: 20,
        velocityScale: 0.75,
      },
      damageTrail: null,
    },
    needle: {
      id: "needle",
      name: "Needle Drill",
      label: "Ndl",
      radius: 2,
      baseVelocity: 850,
      gravityScale: 0.5,
      drag: 0,
      terrainEffectType: "DRILL",
      terrainRadius: 20,
      terrainDepth: 80,
      damageEffectType: "FOCUSED",
      damageRadius: 20,
      damage: 50,
      subMunitions: null,
      damageTrail: null,
    },
    phantomNuke: {
      id: "phantomNuke",
      name: "Phantom Nuke",
      label: "Nuke",
      radius: 7,
      baseVelocity: 520,
      gravityScale: 1.2,
      drag: 0.01,
      terrainEffectType: "CRATER",
      terrainRadius: 95,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 95,
      damage: 90,
      subMunitions: null,
      damageTrail: null,
    },
    ghostShotgun: {
      id: "ghostShotgun",
      name: "Ghost Spread",
      label: "G-Sht",
      radius: 3,
      baseVelocity: 690,
      gravityScale: 1.0,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 22,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 22,
      damage: 20,
      subMunitions: null,
      damageTrail: null,
    },
    spectreVolley: {
      id: "spectreVolley",
      name: "Spectre Volley",
      label: "S-Vly",
      radius: 4,
      baseVelocity: 620,
      gravityScale: 0.95,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 28,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 28,
      damage: 26,
      subMunitions: null,
      damageTrail: null,
    },
    toxicTrail: {
      id: "toxicTrail",
      name: "Toxic Trail",
      label: "Tox",
      radius: 5,
      baseVelocity: 600,
      gravityScale: 1.0,
      drag: 0,
      terrainEffectType: "CRATER",
      terrainRadius: 25,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 50,
      damage: 15,
      subMunitions: null,
      damageTrail: {
        radius: 50,
        damagePerSecond: 12,
        durationSeconds: 5,
      },
    },
  },
  tanks: {
    "heavy-armor": {
      id: "heavy-armor",
      name: "Heavy Armor",
      maxHealth: 100,
      maxFuel: 180,
      movementQuantum: 6,
      fuelRate: 1.2,
      climbCapability: 4,
      width: 36,
      height: 24,
      visual: { fill: "#ef4444", stroke: "#991b1b", accent: "#fca5a5", label: "HA" },
      loadout: [
        "basicShell",
        "titanShell",
        "autocannonStream",
        "siegeVolley",
        "heavyBounce",
      ],
    },
    "desert-striker": {
      id: "desert-striker",
      name: "Desert Striker",
      maxHealth: 100,
      maxFuel: 280,
      movementQuantum: 10,
      fuelRate: 0.8,
      climbCapability: 6,
      width: 30,
      height: 22,
      visual: { fill: "#eab308", stroke: "#854d0e", accent: "#fef08a", label: "DS" },
      loadout: [
        "basicShell",
        "precisionLaser",
        "sandstormCluster",
        "scatterShotgun",
        "thermalHazard",
      ],
    },
    "vanguard-cyber": {
      id: "vanguard-cyber",
      name: "Vanguard Cyber",
      maxHealth: 100,
      maxFuel: 240,
      movementQuantum: 8,
      fuelRate: 1,
      climbCapability: 5,
      width: 32,
      height: 24,
      visual: { fill: "#06b6d4", stroke: "#155e75", accent: "#a5f3fc", label: "VC" },
      loadout: [
        "basicShell",
        "mortar",
        "heavyShell",
        "cluster",
        "needle",
      ],
    },
    specter: {
      id: "specter",
      name: "Specter",
      maxHealth: 100,
      maxFuel: 240,
      movementQuantum: 8,
      fuelRate: 1,
      climbCapability: 5,
      width: 32,
      height: 24,
      visual: { fill: "#a855f7", stroke: "#581c87", accent: "#e9d5ff", label: "S" },
      loadout: [
        "basicShell",
        "phantomNuke",
        "ghostShotgun",
        "spectreVolley",
        "toxicTrail",
      ],
    },
  },
};
