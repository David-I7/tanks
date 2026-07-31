import type {
  ProjectileDefinition,
  TankDefinition as DomainTankDefinition,
} from "../types";

export function createInitialWeaponAmmo(
  loadout: Array<{
    id: string;
    projectileDefinitionId: string;
    maxAmmo?: number;
  }>,
  projectileDefinitions?: Record<string, ProjectileDefinition>,
): Record<string, number> {
  const weaponAmmo: Record<string, number> = {};
  for (const slot of loadout) {
    if (slot.maxAmmo !== undefined) {
      weaponAmmo[slot.id] = slot.maxAmmo;
    } else if (
      projectileDefinitions &&
      projectileDefinitions[slot.projectileDefinitionId]?.maxAmmo !== undefined
    ) {
      weaponAmmo[slot.id] =
        projectileDefinitions[slot.projectileDefinitionId]!.maxAmmo!;
    } else {
      weaponAmmo[slot.id] =
        slot.projectileDefinitionId === "basicShell" || slot.id === "standard"
          ? -1
          : 1;
    }
  }
  return weaponAmmo;
}

export type GameContent = {
  version: string;
  world: {
    width: number;
    height: number;
    tickRateHz: number;
    gravity: number;
    projectileTimeStepSeconds: number;
    maxProjectileSteps: number;
    movementSegmentDurationTicks: number;
  };
  tanks: Record<string, DomainTankDefinition>;
  projectiles: Record<string, ProjectileDefinition>;
};

export const localGameContent: GameContent = {
  version: "game-content.v1",
  world: {
    width: 1280,
    height: 720,
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
      pattern: { kind: "standard" },
      maxAmmo: -1,
      visual: { fill: "#f97316", stroke: "#c2410c" },
    },
    // Heavy Armor Unique Weapons
    titanShell: {
      id: "titanShell",
      name: "Titan Shell",
      physics: {
        radius: 9,
        gravityScale: 1.25,
        drag: 0.015,
        muzzleVelocityScale: 0.88,
      },
      terrainEffect: { type: "crater", radius: 85 },
      damageEffect: { type: "radial", radius: 85, damage: 85 },
      impactAnimationId: "red-slam",
      impactDuration: 0.65,
      pattern: { kind: "nuke", screenShake: 22 },
      maxAmmo: 1,
      visual: { fill: "#ef4444", stroke: "#991b1b" },
    },
    autocannonStream: {
      id: "autocannonStream",
      name: "0.08s Autocannon",
      physics: {
        radius: 3,
        gravityScale: 0.9,
        drag: 0,
        muzzleVelocityScale: 1.1,
      },
      terrainEffect: { type: "crater", radius: 25 },
      damageEffect: { type: "radial", radius: 25, damage: 20 },
      impactAnimationId: "spark-burst",
      impactDuration: 0.3,
      pattern: { kind: "autocannon", count: 4, delaySeconds: 0.08 },
      maxAmmo: 1,
      visual: { fill: "#fbbf24", stroke: "#d97706" },
    },
    siegeVolley: {
      id: "siegeVolley",
      name: "3-Shot Siege Volley",
      physics: {
        radius: 4,
        gravityScale: 1.0,
        drag: 0,
        muzzleVelocityScale: 1.0,
      },
      terrainEffect: { type: "crater", radius: 30 },
      damageEffect: { type: "radial", radius: 30, damage: 25 },
      impactAnimationId: "orange-pop",
      impactDuration: 0.35,
      pattern: {
        kind: "volley",
        count: 3,
        delaySeconds: 0.12,
        spreadAngleDegrees: 10,
      },
      maxAmmo: 1,
      visual: { fill: "#38bdf8", stroke: "#0284c7" },
    },
    heavyBounce: {
      id: "heavyBounce",
      name: "Bouncing Bomb",
      physics: {
        radius: 5,
        gravityScale: 1.1,
        drag: 0,
        muzzleVelocityScale: 0.95,
      },
      terrainEffect: { type: "crater", radius: 35 },
      damageEffect: { type: "radial", radius: 35, damage: 40 },
      impactAnimationId: "red-slam",
      impactDuration: 0.45,
      pattern: { kind: "bouncing", maxBounces: 5 },
      maxAmmo: 1,
      visual: { fill: "#a855f7", stroke: "#7e22ce" },
    },

    // Desert Striker Unique Weapons
    precisionLaser: {
      id: "precisionLaser",
      name: "Plasma Penetrator",
      physics: {
        radius: 3,
        gravityScale: 0.6,
        drag: 0,
        muzzleVelocityScale: 1.4,
      },
      terrainEffect: { type: "drill", radius: 35, depth: 70 },
      damageEffect: { type: "focused", radius: 35, damage: 65 },
      impactAnimationId: "blue-flash",
      impactDuration: 0.4,
      pattern: { kind: "laser", depthMultiplier: 1.8 },
      maxAmmo: 1,
      visual: { fill: "#22c55e", stroke: "#15803d" },
    },
    sandstormCluster: {
      id: "sandstormCluster",
      name: "Sandstorm Cluster",
      physics: {
        radius: 4,
        gravityScale: 0.9,
        drag: 0.02,
        muzzleVelocityScale: 1.1,
      },
      terrainEffect: { type: "crater", radius: 30 },
      damageEffect: { type: "radial", radius: 30, damage: 25 },
      impactAnimationId: "spark-burst",
      impactDuration: 0.4,
      pattern: { kind: "cluster", count: 3, splitAtApex: true },
      maxAmmo: 1,
      visual: { fill: "#eab308", stroke: "#a16207" },
    },
    scatterShotgun: {
      id: "scatterShotgun",
      name: "Turret Shotgun",
      physics: {
        radius: 3,
        gravityScale: 1.0,
        drag: 0,
        muzzleVelocityScale: 1.15,
      },
      terrainEffect: { type: "crater", radius: 20 },
      damageEffect: { type: "radial", radius: 20, damage: 18 },
      impactAnimationId: "spark-burst",
      impactDuration: 0.3,
      pattern: { kind: "shotgun", count: 5, spreadAngleDegrees: 15 },
      maxAmmo: 1,
      visual: { fill: "#f59e0b", stroke: "#b45309" },
    },
    thermalHazard: {
      id: "thermalHazard",
      name: "Thermal Hazard",
      physics: {
        radius: 5,
        gravityScale: 1.0,
        drag: 0,
        muzzleVelocityScale: 1.0,
      },
      terrainEffect: { type: "crater", radius: 25 },
      damageEffect: { type: "radial", radius: 45, damage: 15 },
      impactAnimationId: "smoke-ring",
      impactDuration: 0.5,
      pattern: {
        kind: "damageTrail",
        durationSeconds: 5,
        damagePerSecond: 10,
        radius: 45,
      },
      maxAmmo: 1,
      visual: { fill: "#ef4444", stroke: "#b91c1c" },
    },

    // Vanguard Cyber Unique Weapons / Legacy compatible definitions
    mortar: {
      id: "mortar",
      name: "Hyper Autocannon",
      physics: {
        radius: 5,
        gravityScale: 1.36,
        drag: 0.02,
        muzzleVelocityScale: 0.78,
      },
      terrainEffect: { type: "crater", radius: 25 },
      damageEffect: { type: "radial", radius: 25, damage: 22 },
      impactAnimationId: "spark-burst",
      impactDuration: 0.3,
      pattern: { kind: "autocannon", count: 4, delaySeconds: 0.08 },
      maxAmmo: 1,
      visual: { fill: "#38bdf8", stroke: "#0284c7" },
    },
    heavyShell: {
      id: "heavyShell",
      name: "Cyber Laser",
      physics: {
        radius: 7,
        gravityScale: 1.14,
        drag: 0.01,
        muzzleVelocityScale: 0.92,
      },
      terrainEffect: { type: "drill", radius: 38, depth: 42 },
      damageEffect: { type: "focused", radius: 34, damage: 72 },
      impactAnimationId: "blue-flash",
      impactDuration: 0.45,
      pattern: { kind: "laser", depthMultiplier: 2.0 },
      maxAmmo: 1,
      visual: { fill: "#06b6d4", stroke: "#0891b2" },
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
      pattern: { kind: "cluster", count: 3, splitAtApex: true },
      maxAmmo: 1,
      visual: { fill: "#8b5cf6", stroke: "#6d28d9" },
    },
    needle: {
      id: "needle",
      name: "Ricochet Spike",
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
      pattern: { kind: "bouncing", maxBounces: 5 },
      maxAmmo: 1,
      visual: { fill: "#6366f1", stroke: "#4338ca" },
    },

    // Specter Unique Weapons
    phantomNuke: {
      id: "phantomNuke",
      name: "Phantom Nuke",
      physics: {
        radius: 8,
        gravityScale: 1.2,
        drag: 0.01,
        muzzleVelocityScale: 0.9,
      },
      terrainEffect: { type: "crater", radius: 80 },
      damageEffect: { type: "radial", radius: 80, damage: 80 },
      impactAnimationId: "red-slam",
      impactDuration: 0.6,
      pattern: { kind: "nuke", screenShake: 22 },
      maxAmmo: 1,
      visual: { fill: "#ec4899", stroke: "#be185d" },
    },
    ghostShotgun: {
      id: "ghostShotgun",
      name: "Ghost Shotgun",
      physics: {
        radius: 3,
        gravityScale: 1.0,
        drag: 0,
        muzzleVelocityScale: 1.2,
      },
      terrainEffect: { type: "crater", radius: 22 },
      damageEffect: { type: "radial", radius: 22, damage: 20 },
      impactAnimationId: "spark-burst",
      impactDuration: 0.3,
      pattern: { kind: "shotgun", count: 5, spreadAngleDegrees: 20 },
      maxAmmo: 1,
      visual: { fill: "#d946ef", stroke: "#a21caf" },
    },
    spectreVolley: {
      id: "spectreVolley",
      name: "Spectre Volley",
      physics: {
        radius: 4,
        gravityScale: 0.95,
        drag: 0,
        muzzleVelocityScale: 1.05,
      },
      terrainEffect: { type: "crater", radius: 28 },
      damageEffect: { type: "radial", radius: 28, damage: 26 },
      impactAnimationId: "orange-pop",
      impactDuration: 0.35,
      pattern: {
        kind: "volley",
        count: 3,
        delaySeconds: 0.12,
        spreadAngleDegrees: 12,
      },
      maxAmmo: 1,
      visual: { fill: "#f43f5e", stroke: "#be123c" },
    },
    toxicTrail: {
      id: "toxicTrail",
      name: "Toxic Trail",
      physics: {
        radius: 5,
        gravityScale: 1.0,
        drag: 0,
        muzzleVelocityScale: 1.0,
      },
      terrainEffect: { type: "crater", radius: 25 },
      damageEffect: { type: "radial", radius: 50, damage: 15 },
      impactAnimationId: "smoke-ring",
      impactDuration: 0.5,
      pattern: {
        kind: "damageTrail",
        durationSeconds: 5,
        damagePerSecond: 12,
        radius: 50,
      },
      maxAmmo: 1,
      visual: { fill: "#10b981", stroke: "#047857" },
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
      visual: { fill: "#ef4444", stroke: "#991b1b", accent: "#fca5a5" },
      loadout: [
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "mortar", projectileDefinitionId: "titanShell", label: "Ttn" },
        {
          id: "autocannon",
          projectileDefinitionId: "autocannonStream",
          label: "Auto",
        },
        { id: "volley", projectileDefinitionId: "siegeVolley", label: "Vly" },
        { id: "bouncing", projectileDefinitionId: "heavyBounce", label: "Bnc" },
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
      visual: { fill: "#eab308", stroke: "#854d0e", accent: "#fef08a" },
      loadout: [
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        {
          id: "mortar",
          projectileDefinitionId: "precisionLaser",
          label: "Lsr",
        },
        {
          id: "cluster",
          projectileDefinitionId: "sandstormCluster",
          label: "Clu",
        },
        {
          id: "shotgun",
          projectileDefinitionId: "scatterShotgun",
          label: "Sht",
        },
        { id: "trail", projectileDefinitionId: "thermalHazard", label: "Trl" },
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
      visual: { fill: "#06b6d4", stroke: "#155e75", accent: "#a5f3fc" },
      loadout: [
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "mortar", projectileDefinitionId: "mortar", label: "Auto" },
        { id: "heavy", projectileDefinitionId: "heavyShell", label: "Pls" },
        { id: "cluster", projectileDefinitionId: "cluster", label: "Clu" },
        { id: "needle", projectileDefinitionId: "needle", label: "Spk" },
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
      visual: { fill: "#a855f7", stroke: "#581c87", accent: "#e9d5ff" },
      loadout: [
        { id: "standard", projectileDefinitionId: "basicShell", label: "Std" },
        { id: "mortar", projectileDefinitionId: "phantomNuke", label: "Nuke" },
        {
          id: "ghostshotgun",
          projectileDefinitionId: "ghostShotgun",
          label: "G-Sht",
        },
        {
          id: "spectrevolley",
          projectileDefinitionId: "spectreVolley",
          label: "S-Vly",
        },
        { id: "toxic", projectileDefinitionId: "toxicTrail", label: "Tox" },
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

const PROJECTILE_TYPES: Record<string, string> = {
  standard: "Standard",
  nuke: "Tactical Nuke",
  autocannon: "4-Round Stream",
  volley: "Angled Volley",
  bouncing: "5x Ricochet",
  laser: "Crater Laser",
  cluster: "Apex Split",
  shotgun: "5-Bullet Spread",
  damageTrail: "5s Damage Trail",
};

export const TANK_DEFINITIONS = Object.fromEntries(
  Object.entries(localGameContent.tanks).map(([id, tank]) => [
    id,
    {
      id: id as TankDefinitionIds,
      name: tank.name,
      description: TANK_DESCRIPTIONS[id] ?? `${tank.name} chassis.`,
      color: tank.visual?.fill ?? "#a855f7",
      projectiles: tank.loadout.map((slot) => {
        const projDef =
          localGameContent.projectiles[slot.projectileDefinitionId];
        const kind = projDef?.pattern?.kind ?? "standard";
        return {
          id: slot.projectileDefinitionId as any,
          name: projDef?.name ?? slot.label,
          label: slot.label,
          color: projDef?.visual?.fill ?? "#38bdf8",
          type: PROJECTILE_TYPES[kind] ?? "Special Payload",
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
