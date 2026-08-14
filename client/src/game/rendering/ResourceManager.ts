import type {
  ProjectileDefinition,
  TankDefinition as DomainTankDefinition,
} from "../types";

export function createInitialWeaponAmmo(
  loadout: string[],
): Record<string, number> {
  const weaponAmmo: Record<string, number> = {};
  for (const slotId of loadout) {
    weaponAmmo[slotId] =
      slotId === "basicShell" || slotId === "standard" ? -1 : 1;
  }
  return weaponAmmo;
}

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
        durationSeconds: 5,
      },
    },
    mortar: {
      id: "mortar",
      name: "Hyper Autocannon",
      label: "Auto",
      radius: 5,
      baseVelocity: 500,
      gravityScale: 1.36,
      drag: 0.02,
      terrainEffectType: "CRATER",
      terrainRadius: 25,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 25,
      damage: 22,
      subMunitions: null,
      damageTrail: null,
    },
    heavyShell: {
      id: "heavyShell",
      name: "Cyber Laser",
      label: "Pls",
      radius: 7,
      baseVelocity: 560,
      gravityScale: 1.14,
      drag: 0.01,
      terrainEffectType: "DRILL",
      terrainRadius: 38,
      terrainDepth: 42,
      damageEffectType: "FOCUSED",
      damageRadius: 34,
      damage: 72,
      subMunitions: null,
      damageTrail: null,
    },
    cluster: {
      id: "cluster",
      name: "Cluster",
      label: "Clu",
      radius: 3,
      baseVelocity: 620,
      gravityScale: 0.92,
      drag: 0.035,
      terrainEffectType: "CRATER",
      terrainRadius: 30,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 78,
      damage: 30,
      subMunitions: {
        count: 3,
        projectileDefinitionId: "basicShell",
        spreadAngleDegrees: 15,
        velocityScale: 0.8,
      },
      damageTrail: null,
    },
    needle: {
      id: "needle",
      name: "Ricochet Spike",
      label: "Spk",
      radius: 2,
      baseVelocity: 750,
      gravityScale: 0.8,
      drag: 0,
      terrainEffectType: "DRILL",
      terrainRadius: 16,
      terrainDepth: 56,
      damageEffectType: "FOCUSED",
      damageRadius: 22,
      damage: 58,
      subMunitions: null,
      damageTrail: null,
    },
    phantomNuke: {
      id: "phantomNuke",
      name: "Phantom Nuke",
      label: "Nuke",
      radius: 8,
      baseVelocity: 540,
      gravityScale: 1.2,
      drag: 0.01,
      terrainEffectType: "CRATER",
      terrainRadius: 80,
      terrainDepth: 0,
      damageEffectType: "RADIAL",
      damageRadius: 80,
      damage: 80,
      subMunitions: null,
      damageTrail: null,
    },
    ghostShotgun: {
      id: "ghostShotgun",
      name: "Ghost Shotgun",
      label: "G-Sht",
      radius: 3,
      baseVelocity: 680,
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
      maxHealth: 130,
      maxFuel: 180,
      movementQuantum: 6,
      fuelRate: 1.2,
      climbCapability: 4,
      width: 36,
      height: 24,
      visual: {
        fill: "#ef4444",
        stroke: "#991b1b",
        accent: "#fca5a5",
        label: "HA",
      },
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
      maxHealth: 95,
      maxFuel: 280,
      movementQuantum: 10,
      fuelRate: 0.8,
      climbCapability: 6,
      width: 30,
      height: 22,
      visual: {
        fill: "#eab308",
        stroke: "#854d0e",
        accent: "#fef08a",
        label: "DS",
      },
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
      maxHealth: 110,
      maxFuel: 240,
      movementQuantum: 8,
      fuelRate: 1,
      climbCapability: 5,
      width: 32,
      height: 24,
      visual: {
        fill: "#06b6d4",
        stroke: "#155e75",
        accent: "#a5f3fc",
        label: "VC",
      },
      loadout: ["basicShell", "mortar", "heavyShell", "cluster", "needle"],
    },
    specter: {
      id: "specter",
      name: "Specter",
      maxHealth: 94,
      maxFuel: 240,
      movementQuantum: 8,
      fuelRate: 1,
      climbCapability: 5,
      width: 32,
      height: 24,
      visual: {
        fill: "#a855f7",
        stroke: "#581c87",
        accent: "#e9d5ff",
        label: "S",
      },
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

const TANK_DESCRIPTIONS: Record<string, string> = {
  "heavy-armor": "Reinforced steel hull with heavy dual-barreled firepower.",
  "desert-striker":
    "High mobility chassis optimized for speed and long-range accuracy.",
  "vanguard-cyber": "Futuristic navy alloy tank featuring energy rail cannons.",
  specter: "Stealth shadow tank equipped with tactical nukes and toxic trails.",
};

export const TANK_DEFINITIONS = Object.fromEntries(
  Object.entries(localGameContent.tanks).map(([id, tank]) => [
    id,
    {
      id: id as TankDefinitionIds,
      name: tank.name,
      description: TANK_DESCRIPTIONS[id] ?? `${tank.name} chassis.`,
      color: tank.visual.fill,
      projectiles: tank.loadout.map((slotId) => {
        const projDef = localGameContent.projectiles[slotId];
        return {
          id: slotId as any,
          name: projDef?.name ?? slotId,
          label: projDef?.label ?? slotId,
          color: "#38bdf8",
          type: "Payload",
        };
      }),
    },
  ]),
);

export type TankDefinitionIds = keyof typeof localGameContent.tanks;
export type TankProjectileDefinitionIds =
  keyof typeof localGameContent.projectiles;

export type TankProjectileDefinition = {
  id: TankProjectileDefinitionIds;
  name: string;
  label: string;
  color: string;
  type: string;
};

export type TankDefinitionUi = {
  id: TankDefinitionIds;
  name: string;
  description: string;
  color: string;
  projectiles: TankProjectileDefinition[];
};

export type TankDefinition = TankDefinitionUi;

export default class ResourceManager {
  private static instance: ResourceManager | null = null;
  private readonly content: GameContent = localGameContent;

  private constructor() {}

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  getGameContent(): GameContent {
    return this.content;
  }

  getTankDefinitions(): typeof TANK_DEFINITIONS {
    return TANK_DEFINITIONS;
  }
}
