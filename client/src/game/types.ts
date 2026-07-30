export type EntityId = number;

export type GameMode = "online" | "localTwoPlayer" | "playerVsAi";

export type ControllerKind = "human" | "ai" | "remote";

export type GameAction =
  | { type: "move"; direction: -1 | 1 }
  | { type: "aim"; angle: number; power: number }
  | { type: "selectProjectileSlot"; projectileSlotId: string }
  | {
      type: "fire";
      angle: number;
      power: number;
      projectileSlotId: string;
    };

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
  fill?: string;
  stroke?: string;
  accent?: string;
  label?: string;
};

export type ProjectilePhysics = {
  radius: number;
  gravityScale: number;
  drag: number;
  muzzleVelocityScale: number;
};

export type ProjectilePattern =
  | { kind: "standard" }
  | { kind: "bouncing"; maxBounces: number }
  | {
      kind: "damageTrail";
      durationSeconds: number;
      damagePerSecond: number;
      radius: number;
    }
  | { kind: "autocannon"; count: number; delaySeconds: number }
  | {
      kind: "volley";
      count: number;
      delaySeconds: number;
      spreadAngleDegrees: number;
    }
  | { kind: "shotgun"; count: number; spreadAngleDegrees: number }
  | { kind: "cluster"; count: number; splitAtApex: boolean }
  | { kind: "laser"; depthMultiplier: number }
  | { kind: "nuke"; screenShake: number };

export type TerrainEffect =
  | { type: "crater"; radius: number }
  | { type: "drill"; radius: number; depth: number };

export type DamageEffect =
  | { type: "radial"; radius: number; damage: number }
  | { type: "focused"; radius: number; damage: number };

export type ProjectileDefinition = {
  id: string;
  name: string;
  physics: ProjectilePhysics;
  terrainEffect: TerrainEffect;
  damageEffect: DamageEffect;
  impactAnimationId: string;
  impactDuration: number;
  pattern?: ProjectilePattern;
  maxAmmo?: number;
  visual?: VisualIdentity;
};

export type ProjectileSlot = {
  id: string;
  projectileDefinitionId: string;
  label: string;
  maxAmmo?: number;
};

export type TankDefinition = {
  id: string;
  name: string;
  maxHealth: number;
  maxFuel: number;
  movementQuantum: number;
  fuelRate: number;
  climbCapability: number;
  collisionRadius: number;
  halfWidth: number;
  trackGroundOffset: number;
  muzzleForwardOffset: number;
  muzzleVerticalOffset: number;
  loadout: ProjectileSlot[];
  visual?: VisualIdentity;
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
  loadout: ProjectileSlot[];
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
  visual?: VisualIdentity;
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
  impactAnimationId: string;
  impactDuration: number;
  pattern?: ProjectilePattern;
  bouncesCount?: number;
  hasSplit?: boolean;
  visual?: VisualIdentity;
};

export type DamageTrail = {
  id: string;
  x: number;
  y: number;
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
  id: string;
  type: LootCrateType;
  x: number;
  y: number;
  groundY: number;
  falling: boolean;
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
  damageTrails?: DamageTrail[];
  lootCrates?: LootCrate[];
  particles?: Particle[];
  floatingTexts?: FloatingText[];
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
  damageTrails?: DamageTrail[];
  lootCrates?: LootCrate[];
  particles?: Particle[];
  floatingTexts?: FloatingText[];
}>;

export type GameAssets = {
  images: {
    tank: HTMLImageElement;
  };
};

export const MAX_TURN_SECONDS = 30;
export const MAX_TANK_FUEL = 240;
export const MOVE_FUEL_COST = 1;
