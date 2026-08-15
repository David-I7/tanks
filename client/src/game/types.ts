import type { GameContent } from "./content/localGameContent";

export type EntityId = number;

export type GameMode = "online" | "localTwoPlayer";

export type ControllerKind = "human" | "remote";

export type GameAction =
  | { type: "move"; direction: -1 | 1 }
  | { type: "aim"; angle: number; power: number }
  | { type: "selectProjectileSlot"; projectileSlotId: string }
  | {
      type: "fire";
      angle: number;
      power: number;
      projectileSlotId: string;
    }
  | { type: "panCamera"; deltaX: number }
  | { type: "relockCamera" };

export type RemoteGameAction = {
  playerId: number;
  intent: GameAction;
};

export type TurnPhase =
  | "thinking"
  | "ballistics"
  | "impact"
  | "transition"
  | "gameOver";

export type Vec2 = {
  x: number;
  y: number;
};

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

export type ProjectileSlot = {
  id: string;
  projectileDefinitionId: string;
  label: string;
};

export type TankDefinition = {
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

export type TankSelection = {
  tankDefinitionId: string;
};

export type MatchSetupPlayer = {
  id: number;
  displayName: string;
  controllerKind: ControllerKind;
  tankSelection: TankSelection;
};

export type MatchSetup = {
  mode: GameMode;
  players: MatchSetupPlayer[];
};

export type PositionComponent = Vec2;

export type VelocityComponent = Vec2;

export type TankComponent = {
  playerId: number;
  displayName: string;
  controllerKind: ControllerKind;
  tankDefinitionId: string;
  tankName: string;
  width: number;
  height: number;
  loadout: string[];
  selectedProjectileSlotId: string;
  weaponAmmo: Record<string, number>;
  maxHealth: number;
  health: number;
  facing: 1 | -1;
  bodyAngle: number;
  aimAngle: number;
  power: number;
  maxFuel: number;
  fuel: number;
  alive: boolean;
  visual: VisualIdentity;
};

export type ProjectileComponent = {
  ownerPlayerId: number;
  projectileDefinitionId: string;
  name: string;
  power: number;
  radius: number;
  physics: ProjectilePhysics;
  terrainEffect: TerrainEffect;
  damageEffect: DamageEffect;
  position: Vec2;
  velocity: Vec2;
};

export type DamageTrail = {
  id: string;
  position: Vec2;
  radius: number;
  damagePerSecond: number;
  remainingDuration: number;
  ownerPlayerId: number;
};

export type ImpactEvent = {
  id: number;
  position: Vec2;
  animationId: string;
  age: number;
  duration: number;
  visual: VisualIdentity;
};

export type LifetimeComponent = {
  active: boolean;
};

export type LootCrateType = "hp" | "fuel" | "ammo";

export type LootCrate = {
  crateId: string;
  crateType: LootCrateType;
  x: number;
  y: number;
  targetY: number;
  isLanding: boolean;
  collected: boolean;
  value: number;
};

export type Particle = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
};

export type FloatingText = {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
  vy: number;
  life: number;
  maxLife: number;
};

export type MapBiome = "forest" | "desert" | "ice";

export type DecorType = "tree" | "rock" | "bunker" | "grass";

export type DecorObject = {
  id: string;
  type: DecorType;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  destroyed: boolean;
};

export type Cloud = {
  x: number;
  y: number;
  speed: number;
  scale: number;
  opacity: number;
};

export type MatchState = {
  mode: GameMode;
  phase: TurnPhase;
  activePlayerId: number;
  playerCount: number;
  turnNumber: number;
  turnTimeRemaining: number;
  matchTimeRemaining: number;
  wind: number;
  winnerPlayerId: number | null;
  biome: MapBiome;
  isCameraLocked: boolean;
  cameraX: number;
};

export type HeightmapTerrainSnapshot = {
  kind: "heightmap";
  width: number;
  height: number;
  surface: number[];
};

export type TerrainSnapshot = HeightmapTerrainSnapshot;

type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export type LocalSimulationState = DeepReadonly<{
  match: MatchState;
  terrain: TerrainSnapshot;
  tanks: Array<{
    entityId: EntityId;
    position: PositionComponent;
    tank: TankComponent;
  }>;
  projectiles: Array<{
    entityId: EntityId;
    position: PositionComponent;
    velocity: VelocityComponent;
    projectile: ProjectileComponent;
  }>;
  impactEvents: ImpactEvent[];
  damageTrails: DamageTrail[];
  lootCrates: LootCrate[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  decors: DecorObject[];
  clouds: Cloud[];
}>;

export type GameState = DeepReadonly<{
  match: MatchState;
  terrain: TerrainSnapshot;
  projectileDefinitions: Record<string, ProjectileDefinition>;
  tanks: Array<
    TankComponent & {
      entityId: EntityId;
      position: PositionComponent;
    }
  >;
  projectiles: Array<
    ProjectileComponent & {
      entityId: EntityId;
      position: PositionComponent;
      velocity: VelocityComponent;
    }
  >;
  impactEvents: ImpactEvent[];
  damageTrails: DamageTrail[];
  lootCrates: LootCrate[];
  particles: Particle[];
  floatingTexts: FloatingText[];
  decors: DecorObject[];
  clouds: Cloud[];
}>;

export type GameContext = {
  clock: () => number;
  generateIntentId: () => string;
  gameContent: GameContent;
};

export const MAX_TURN_SECONDS = 30;
export const MAX_TANK_FUEL = 240;
export const MOVE_FUEL_COST = 1;
