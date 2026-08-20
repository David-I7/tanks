// ============================================================================
// 1. Core Geometric & Primitive Types
// ============================================================================

export type EntityId = number;

export type Vec2 = {
  x: number;
  y: number;
};

export type PositionComponent = Vec2;
export type VelocityComponent = Vec2;

export type VisualIdentity = {
  fill: string;
  stroke: string;
  accent: string;
};

export type ProjectileVisual = {
  radius: number;
  fill: string;
  stroke: string;
  accent: string;
};

// ============================================================================
// 2. Catalog & Content Definitions
// ============================================================================

export type MapBiome = "forest" | "desert" | "ice";

export type SpawnRegion = {
  minX: number;
  maxX: number;
};

export type LootCrateConfig = {
  hpValue: number;
  fuelValue: number;
  ammoValue: number;
  collectionRadius: number;
  dropSpeed: number;
  spawnScheduleSeconds: number[];
  spawnEdgeMargin: number;
  maxActiveCrates: number;
};

export type WorldDefinition = {
  biomes: MapBiome[];
  width: number;
  height: number;
  tickRateHz: number;
  gravity: number;
  projectileTimeStepSeconds: number;
  maxProjectileSteps: number;
  movementSegmentDurationTicks: number;
  playerASpawnRegion: SpawnRegion;
  playerBSpawnRegion: SpawnRegion;
  minWind: number;
  maxWind: number;
  turnDurationSeconds: number;
  matchDurationSeconds: number;
  postImpactDelaySeconds: number;
  lootCrates: LootCrateConfig;
};

export type TerrainEffect =
  | { type: "crater"; radius: number }
  | { type: "drill"; radius: number; depth: number };

export type DamageEffect =
  | { type: "radial"; radius: number; damage: number }
  | { type: "focused"; radius: number; damage: number };

export type HazardType = "FIRE" | "FROST" | "QUAKE" | "ELECTRIC";

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
  hazardType?: HazardType;
};

export type SalvoConfig = {
  shotCount: number;
  delaySeconds: number;
  gravityScales: number[];
};

export type ApexSplitConfig = {
  splitCount: number;
  totalDamagePool: number;
  spreadVelocity: number;
};

export type BouncerConfig = {
  bounceCount: number;
  durationSeconds: number;
  damagePerBounce: number;
  shockwaveRadius: number;
};

export type ProjectilePhysics = {
  radius: number;
  gravityScale: number;
  muzzleVelocityScale: number;
};

export type ProjectileDefinition = {
  id: string;
  name: string;
  description?: string;
  intendedUse?: string;
  visual: ProjectileVisual;
  baseVelocity: number;
  gravityScale: number;
  initialAmmo?: number;
  terrainEffectType: "CRATER" | "DRILL";
  terrainRadius: number;
  terrainDepth: number;
  damageEffectType: "RADIAL" | "FOCUSED";
  damageRadius: number;
  damage: number;
  subMunitions: SubMunitionConfig | null;
  damageTrail: DamageTrailConfig | null;
  salvo?: SalvoConfig | null;
  apexSplit?: ApexSplitConfig | null;
  bouncer?: BouncerConfig | null;
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
  barrelLength: number;
  turretYOffset: number;
  visual: VisualIdentity;
  loadout: string[];
};

export type ValidationRules = {
  minFirePower: number;
  maxFirePower: number;
  minAimAngle: number;
  maxAimAngle: number;
};

export type GameContent = {
  version: string;
  world: WorldDefinition;
  tanks: Record<string, TankDefinition>;
  projectiles: Record<string, ProjectileDefinition>;
  validation?: ValidationRules;
};

// ============================================================================
// 3. Match Configuration & Rules
// ============================================================================

export type GameMode = "online" | "localTwoPlayer";
export type ControllerKind = "human" | "remote";

export type TurnPhase =
  | "thinking"
  | "ballistics"
  | "impact"
  | "transition"
  | "gameOver";

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

// ============================================================================
// 4. Player Actions & User Intents
// ============================================================================

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

// ============================================================================
// 5. Entity Components & World Objects
// ============================================================================

export type TankComponent = {
  playerId: number;
  displayName: string;
  controllerKind: ControllerKind;
  tankDefinitionId: string;
  tankName: string;
  width: number;
  height: number;
  barrelLength?: number;
  turretYOffset?: number;
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

export type TankEntity = TankComponent & {
  entityId: EntityId;
  position: PositionComponent;
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
  remainingBounces?: number;
};

export type ProjectileEntity = ProjectileComponent & {
  entityId: EntityId;
  position: PositionComponent;
  velocity: VelocityComponent;
};

export type DamageTrail = {
  id: string;
  position: Vec2;
  radius: number;
  damagePerSecond: number;
  remainingDuration: number;
  ownerPlayerId: number;
  hazardType?: HazardType;
};

export type ImpactEvent = {
  id: number;
  position: Vec2;
  animationId: string;
  age: number;
  duration: number;
  visual: VisualIdentity;
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

// ============================================================================
// 6. Environment & Visual Cosmetics
// ============================================================================

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

export type Cloud = {
  x: number;
  y: number;
  speed: number;
  scale: number;
  opacity: number;
};

// ============================================================================
// 7. Terrain State
// ============================================================================

export type HeightmapTerrainSnapshot = {
  kind: "heightmap";
  width: number;
  height: number;
  surface: number[];
};

export type TerrainSnapshot = HeightmapTerrainSnapshot;

// ============================================================================
// 8. Aggregated Game & Simulation State Snapshots
// ============================================================================

export type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends readonly (infer U)[]
    ? readonly DeepReadonly<U>[]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

export type LocalSimulationTankEntry = {
  entityId: EntityId;
  position: PositionComponent;
  tank: TankComponent;
};

export type LocalSimulationProjectileEntry = {
  entityId: EntityId;
  position: PositionComponent;
  velocity: VelocityComponent;
  projectile: ProjectileComponent;
};

export type LocalSimulationState = DeepReadonly<{
  match: MatchState;
  terrain: TerrainSnapshot;
  tanks: LocalSimulationTankEntry[];
  projectiles: LocalSimulationProjectileEntry[];
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
  tanks: TankEntity[];
  projectiles: ProjectileEntity[];
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
