export type EntityId = number;

export type GameMode = "online" | "twoPlayer" | "ai" | "singlePlayer";

export type PlayerIntent =
  | { type: "move"; direction: -1 | 0 | 1 }
  | { type: "aim"; angle: number; power: number }
  | { type: "fire"; angle: number; power: number };

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

export type PositionComponent = Vec2;

export type VelocityComponent = Vec2;

export type TankComponent = {
  playerId: number;
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
  radius: number;
  blastRadius: number;
  damage: number;
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

export type GameSnapshot = {
  match: MatchState;
  terrain: number[];
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
};
