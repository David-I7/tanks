export type Visual = {
  fillStyle: string;
  strokeStyle: string;
  accentColor: string;
  label: string;
};

export type TerrainEffect =
  | { type: "CRATER"; radius: number }
  | { type: "DRILL"; radius: number; depth: number };

export type DamageEffect =
  | { type: "RADIAL"; radius: number; damage: number }
  | { type: "FOCUSED"; radius: number; damage: number };

export type SubMunition = {
  count: number;
  projectileId: string;
  spreadAngleDegrees: number;
  velocityScale: number;
};

export type DamageTrail = {
  radius: number;
  damagePerSecond: number;
  durationSeconds: number;
};

export type Projectile = {
  id: string;
  name: string;
  label: string;
  radius: number;
  baseVelocity: number;
  gravityScale: number;
  drag: number;
  terrainEffect: TerrainEffect;
  damageEffect: DamageEffect;
  subMunitions?: SubMunition | null;
  damageTrail?: DamageTrail | null;
};

export type Tank = {
  id: string;
  name: string;
  description: string;
  maxHealth: number;
  maxFuel: number;
  movementQuantum: number;
  fuelRate: number;
  climbCapability: number;
  width: number;
  height: number;
  visual: Visual;
  loadout: Projectile["id"][];
};

export type GameContent = {
  version: string;
  world: {
    biome: "forest" | "desert" | "ice";
    width: number;
    height: number;
    tickRateHz: number;
    gravity: number;
    deltaTime: number;
    maxProjectileSteps: number;
    movementSegmentDurationTicks: number;
    playerASpawnRegion: {
      minX: number;
      maxX: number;
    };
    playerBSpawnRegion: {
      minX: number;
      maxX: number;
    };
    minWind: number;
    maxWind: number;
  };
  tanks: Record<string, Tank>;
  projectiles: Record<string, Projectile>;
};
