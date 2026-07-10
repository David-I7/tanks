export type EntityId = number;

export type GameMode = "online" | "localTwoPlayer" | "playerVsAi";

export type ControllerKind = "human" | "ai" | "remote";

export type ProjectileSlotId = string;
export type ProjectileDefinitionId = string;
export type TankDefinitionId = string;

export type GameAction =
  | { type: "move"; direction: -1 | 0 | 1 }
  | { type: "aim"; angle: number; power: number }
  | { type: "selectProjectileSlot"; projectileSlotId: ProjectileSlotId }
  | {
      type: "fire";
      angle: number;
      power: number;
      projectileSlotId: ProjectileSlotId;
    };

export type PlayerIntent = GameAction;

export type RemotePlayerIntent = {
  playerId: number;
  intent: PlayerIntent;
};

export type TurnPhase =
  | "aiming"
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

export type ProjectileDefinition = {
  id: ProjectileDefinitionId;
  name: string;
  physics: ProjectilePhysics;
  terrainEffect: TerrainEffect;
  damageEffect: DamageEffect;
  impactAnimationId: string;
  impactDuration: number;
  visual: VisualIdentity;
};

export type ProjectileSlot = {
  id: ProjectileSlotId;
  projectileDefinitionId: ProjectileDefinitionId;
  label: string;
};

export type TankDefinition = {
  id: TankDefinitionId;
  name: string;
  maxHealth: number;
  loadout: ProjectileSlot[];
  visual: VisualIdentity;
};

export type TankSelection = {
  tankDefinitionId: TankDefinitionId;
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
  tankDefinitionId: TankDefinitionId;
  tankName: string;
  visual: VisualIdentity;
  loadout: ProjectileSlot[];
  selectedProjectileSlotId: ProjectileSlotId;
  maxHealth: number;
  health: number;
  facing: 1 | -1;
  bodyAngle: number;
  aimAngle: number;
  power: number;
  maxFuel: number;
  fuel: number;
  alive: boolean;
};

export type ProjectileComponent = {
  ownerPlayerId: number;
  projectileDefinitionId: ProjectileDefinitionId;
  name: string;
  power: number;
  radius: number;
  physics: ProjectilePhysics;
  terrainEffect: TerrainEffect;
  damageEffect: DamageEffect;
  impactAnimationId: string;
  impactDuration: number;
  visual: VisualIdentity;
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

export type MatchState = {
  mode: GameMode;
  phase: TurnPhase;
  activePlayerId: number;
  playerCount: number;
  turnNumber: number;
  turnTimeRemaining: number;
  winnerPlayerId: number | null;
};

export type HeightmapTerrainSnapshot = {
  kind: "heightmap";
  width: number;
  height: number;
  surface: number[];
};

export type HeightmapTerrainPatch = {
  kind: "heightmap-range";
  startX: number;
  surface: number[];
};

export type TerrainPatch = HeightmapTerrainPatch;

export type MaskTerrainSnapshot = {
  kind: "mask";
  width: number;
  height: number;
  solid: Uint8Array;
};

export type TerrainSnapshot = HeightmapTerrainSnapshot | MaskTerrainSnapshot;

export type GameSnapshot = {
  match: MatchState;
  terrain: TerrainSnapshot;
  projectileDefinitions: Record<string, ProjectileDefinition>;
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
};

export type GameViewState = {
  match: MatchState;
  terrain: TerrainSnapshot;
  projectileDefinitions: Record<string, ProjectileDefinition>;
  tanks: GameViewTank[];
  projectiles: GameViewProjectile[];
  impactEvents: ImpactEvent[];
};

export type GameViewTank = TankComponent & {
  entityId: EntityId;
  position: PositionComponent;
};

export type GameViewProjectile = ProjectileComponent & {
  entityId: EntityId;
  position: PositionComponent;
  velocity: VelocityComponent;
};

export type GameAssets = {
  images: {
    tank: HTMLImageElement;
  };
};
