// ============================================================================
// 1. Core Identifiers & Geometry
// ============================================================================

export type GameSessionId = string;
export type PlayerId = number;
export type EntityId = number;
export type IntentId = string;
export type DiffSequence = number;
export type ServerTick = number;

export type OnlineVec2 = {
  x: number;
  y: number;
};

// ============================================================================
// 2. Shared Value Objects & Reusable Schemas
// ============================================================================

export type OnlineBiome = "forest" | "desert" | "ice";

export type OnlineAimData = {
  angle: number;
  power: number;
};

export type OnlineTankVisualDto = {
  fillStyle: string;
  strokeStyle: string;
  accentColor: string;
  label: string;
};

export type OnlineCrateType = "hp" | "fuel" | "ammo";

export type OnlineLootCrateBase = {
  crateId: string;
  crateType: OnlineCrateType;
  targetY: number;
  value: number;
};

export type OnlineTankDamageResponse = {
  entityId: EntityId;
  playerId: PlayerId;
  damageDealt: number;
  healthAfter: number;
};

export type SubMunitionConfigDto = {
  count: number;
  projectileDefinitionId: string;
  spreadAngleDegrees: number;
  velocityScale: number;
};

export type DamageTrailConfigDto = {
  radius: number;
  damagePerSecond: number;
  durationSeconds: number;
};

export type SubMunitionTrajectoryDto = {
  projectileDefinitionId: string;
  launch: OnlineVec2;
  trajectory: OnlineVec2[];
  impact: OnlineVec2;
  damagedTanks: OnlineTankDamageResponse[];
};

export type SpawnRegionDto = {
  minX: number;
  maxX: number;
};

export type OnlineTankCoreAttributesDto = {
  width: number;
  height: number;
  visual: OnlineTankVisualDto;
  maxHealth: number;
  maxFuel: number;
  loadout: string[];
};

// ============================================================================
// 3. Game Content Catalog DTOs
// ============================================================================

export type LootCrateConfigDto = {
  hpValue: number;
  fuelValue: number;
  ammoValue: number;
  collectionRadius: number;
  dropSpeed: number;
  spawnScheduleSeconds: number[];
  spawnEdgeMargin: number;
  maxActiveCrates: number;
};

export type WorldDefinitionDto = {
  biome: OnlineBiome;
  width: number;
  height: number;
  tickRateHz: number;
  gravity: number;
  deltaTime: number;
  maxProjectileSteps: number;
  movementSegmentDurationTicks: number;
  playerASpawnRegion: SpawnRegionDto;
  playerBSpawnRegion: SpawnRegionDto;
  minWind: number;
  maxWind: number;
  turnDurationSeconds: number;
  matchDurationSeconds: number;
  postImpactDelaySeconds: number;
  lootCrates: LootCrateConfigDto;
};

export type TankDefinitionDto = OnlineTankCoreAttributesDto & {
  id: string;
  name: string;
  movementQuantum: number;
  fuelRate: number;
  climbCapability: number;
  barrelLength: number;
  turretYOffset: number;
};

export type ProjectileDefinitionDto = {
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
  subMunitions: SubMunitionConfigDto | null;
  damageTrail: DamageTrailConfigDto | null;
};

export type ValidationRulesDto = {
  minFirePower: number;
  maxFirePower: number;
  minAimAngle: number;
  maxAimAngle: number;
};

export type GameContentResponseDto = {
  version: string;
  world: WorldDefinitionDto;
  tanks: Record<string, TankDefinitionDto>;
  projectiles: Record<string, ProjectileDefinitionDto>;
  validation?: ValidationRulesDto;
};

// ============================================================================
// 4. Player Intent Requests (Client -> Server)
// ============================================================================

export type OnlineMoveRequest = {
  type: "MOVE";
  payload: {
    direction: -1 | 1;
  };
};

export type OnlineAimRequest = {
  type: "AIM";
  payload: OnlineAimData;
};

export type OnlineSelectProjectileSlotRequest = {
  type: "SELECT_PROJECTILE_SLOT";
  payload: {
    slot: number;
  };
};

export type OnlineFireRequest = {
  type: "FIRE";
  payload: OnlineAimData;
};

export type OnlinePlayerIntentRequest =
  | OnlineMoveRequest
  | OnlineAimRequest
  | OnlineSelectProjectileSlotRequest
  | OnlineFireRequest;

export type OnlinePlayerIntentRequestDto<
  TIntent extends OnlinePlayerIntentRequest = OnlinePlayerIntentRequest,
> = {
  gameSessionId: GameSessionId;
  playerId: PlayerId;
  intentId: IntentId;
  lastConfirmedDiffSequence: DiffSequence;
  lastConfirmedDiffServerTick: ServerTick;
  type: TIntent["type"];
  payload: TIntent["payload"];
};

// ============================================================================
// 5. State Diffs & Server Events (Server -> Client)
// ============================================================================

export type OnlineResyncReason =
  | "MISSED_DIFF"
  | "SERVER_CORRECTION"
  | "RECONNECT";

export type OnlineRejectionReason =
  | "STALE_BASE_STATE"
  | "NOT_ACTIVE_PLAYER"
  | "INVALID_PAYLOAD"
  | "TURN_ALREADY_RESOLVING"
  | "INSUFFICIENT_FUEL"
  | "OUT_OF_BOUNDS"
  | "IMPASSABLE_TERRAIN";

export type OnlineTerminalReason =
  | "LAST_TANK_STANDING"
  | "DRAW"
  | "FORFEIT"
  | "MATCH_TIME_EXPIRED";

export type OnlineStateSnapshotPayload = {
  localPlayerId: PlayerId;
  state: OnlineGameStateSnapshotResponse;
};

export type OnlineInitialStateResponse = {
  type: "INITIAL_STATE";
  payload: OnlineStateSnapshotPayload & {
    expectedNextDiffSequence: DiffSequence;
  };
};

export type OnlineResyncStateResponse = {
  type: "RESYNC_STATE";
  payload: OnlineStateSnapshotPayload & {
    replacesSequence: DiffSequence;
    reason: OnlineResyncReason;
  };
};

export type OnlineMovementSegmentResponse = {
  type: "MOVEMENT_SEGMENT";
  payload: {
    playerId: PlayerId;
    tankEntityId: EntityId;
    from: OnlineVec2;
    to: OnlineVec2;
    movementPath: OnlineVec2[];
    fuelBefore: number;
    fuelAfter: number;
    fuelSpent: number;
    partial: boolean;
    startedServerTick: ServerTick;
    endedServerTick: ServerTick;
    durationTicks: number;
  };
};

export type OnlineAimUpdateResponse = {
  type: "AIM_UPDATE";
  payload: {
    playerId: PlayerId;
  } & OnlineAimData;
};

export type OnlineProjectileResolutionResponse = {
  type: "PROJECTILE_RESOLUTION";
  payload: SubMunitionTrajectoryDto & {
    projectileEntityId: EntityId;
    ownerPlayerId: PlayerId;
    subMunitions: SubMunitionTrajectoryDto[];
  };
};

export type OnlineTerrainPatchResponse = {
  type: "TERRAIN_PATCH";
  payload: {
    patches: OnlineTerrainPatchResponseDto[];
  };
};

export type OnlineIntentRejectionResponse = {
  type: "INTENT_REJECTION";
  payload: {
    playerId: PlayerId;
    reason: OnlineRejectionReason;
    authoritativeSequence: DiffSequence;
    authoritativeServerTick: ServerTick;
  };
};

export type OnlineTurnTransitionResponse = {
  type: "TURN_TRANSITION";
  payload: {
    previousPlayerId: PlayerId;
    activePlayerId: PlayerId;
    turnNumber: number;
    phase: "AIMING";
    turnEndsAtServerTick: ServerTick;
    matchEndsAtServerTick: ServerTick | null;
    wind: number;
  };
};

export type OnlineTerminalGameResponse = {
  type: "TERMINAL_GAME";
  payload: {
    winnerPlayerId: PlayerId | null;
    reason: OnlineTerminalReason;
    finalState: OnlineGameStateSnapshotResponse;
  };
};

export type OnlineCrateSpawnedResponse = {
  type: "CRATE_SPAWNED";
  payload: OnlineLootCrateBase & {
    dropX: number;
  };
};

export type OnlineStateDiffResponse =
  | OnlineInitialStateResponse
  | OnlineResyncStateResponse
  | OnlineMovementSegmentResponse
  | OnlineAimUpdateResponse
  | OnlineProjectileResolutionResponse
  | OnlineTerrainPatchResponse
  | OnlineIntentRejectionResponse
  | OnlineTurnTransitionResponse
  | OnlineTerminalGameResponse
  | OnlineCrateSpawnedResponse;

export type OnlineDiffEnvelopeDto = {
  gameSessionId: GameSessionId;
  sequence: DiffSequence;
  serverTick: ServerTick;
  intentId: IntentId | null;
};

export type OnlineDiffResponseDto<
  TDiff extends OnlineStateDiffResponse = OnlineStateDiffResponse,
> = OnlineDiffEnvelopeDto & {
  type: TDiff["type"];
  payload: TDiff["payload"];
};

export type OnlineDiffBatchResponseDto = OnlineDiffEnvelopeDto & {
  diffs: OnlineDiffResponseDto[];
};

// ============================================================================
// 6. Game State Snapshots & Entities
// ============================================================================

export type OnlineTurnPhase =
  | "AIMING"
  | "BALLISTICS"
  | "IMPACT"
  | "TRANSITION"
  | "GAME_OVER";

export type OnlineMatchSnapshotResponse = {
  phase: OnlineTurnPhase;
  activePlayerId: PlayerId;
  playerCount: number;
  turnNumber: number;
  turnTimeRemainingTicks: number;
  winnerPlayerId: PlayerId | null;
  wind: number;
  matchTimeRemainingTicks: number;
  biome: OnlineBiome;
};

export type OnlineTerrainSnapshotResponse = {
  kind: "HEIGHTMAP";
  width: number;
  height: number;
  surface: number[];
};

export type OnlineTerrainPatchResponseDto = {
  kind: "HEIGHTMAP_RANGE";
  startX: number;
  surface: number[];
};

export type OnlineTankSnapshotResponse = OnlineTankCoreAttributesDto & {
  entityId: EntityId;
  playerId: PlayerId;
  displayName: string;
  tankDefinitionId: string;
  position: OnlineVec2;
  facing: 1 | -1;
  aimAngle: number;
  power: number;
  selectedProjectileSlotId: string;
  weaponAmmo?: Record<string, number>;
  health: number;
  fuel: number;
  alive: boolean;
};

export type OnlineProjectileSlotSnapshotResponse = {
  id: string;
  projectileDefinitionId: string;
  label: string;
};

export type OnlineProjectileSnapshotResponse = {
  entityId: EntityId;
  ownerPlayerId: PlayerId;
  projectileDefinitionId: string;
  position: OnlineVec2;
  velocity: OnlineVec2;
};

export type OnlineLootCrateSnapshot = OnlineLootCrateBase & {
  x: number;
  y: number;
  isLanding: boolean;
  collected: boolean;
};

export type OnlineDamageTrailEvent = DamageTrailConfigDto & {
  id: string;
  position: OnlineVec2;
  ownerPlayerId: PlayerId;
};

export type OnlineGameStateSnapshotResponse = {
  gameContentVersion: string;
  gameContent: GameContentResponseDto;
  match: OnlineMatchSnapshotResponse;
  terrain: OnlineTerrainSnapshotResponse;
  tanks: OnlineTankSnapshotResponse[];
  projectiles: OnlineProjectileSnapshotResponse[];
  lootCrates: OnlineLootCrateSnapshot[];
  damageTrails: OnlineDamageTrailEvent[];
};

// ============================================================================
// 7. Runtime Validators & Type Guards
// ============================================================================

const ONLINE_STATE_DIFF_TYPES = new Set<OnlineStateDiffResponse["type"]>([
  "INITIAL_STATE",
  "RESYNC_STATE",
  "MOVEMENT_SEGMENT",
  "AIM_UPDATE",
  "PROJECTILE_RESOLUTION",
  "TERRAIN_PATCH",
  "INTENT_REJECTION",
  "TURN_TRANSITION",
  "TERMINAL_GAME",
  "CRATE_SPAWNED",
]);

export function isOnlineDiffResponseDto(
  value: unknown,
): value is OnlineDiffResponseDto {
  if (!value || typeof value !== "object") return false;

  const candidate = value as {
    gameSessionId?: unknown;
    sequence?: unknown;
    serverTick?: unknown;
    type?: unknown;
    intentId?: unknown;
    payload?: unknown;
  };

  return (
    typeof candidate.gameSessionId === "string" &&
    typeof candidate.sequence === "number" &&
    typeof candidate.serverTick === "number" &&
    typeof candidate.type === "string" &&
    ONLINE_STATE_DIFF_TYPES.has(
      candidate.type as OnlineStateDiffResponse["type"],
    ) &&
    (typeof candidate.intentId === "string" || candidate.intentId === null) &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
}

export function isOnlineDiffBatchResponseDto(
  value: unknown,
): value is OnlineDiffBatchResponseDto {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.gameSessionId === "string" &&
    typeof candidate.sequence === "number" &&
    typeof candidate.serverTick === "number" &&
    (typeof candidate.intentId === "string" || candidate.intentId === null) &&
    Array.isArray(candidate.diffs) &&
    candidate.diffs.every(isOnlineDiffResponseDto)
  );
}
