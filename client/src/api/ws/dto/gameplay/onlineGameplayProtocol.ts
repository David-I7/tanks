export type GameSessionId = string;
export type PlayerId = number;
export type EntityId = number;
export type IntentId = string;
export type DiffSequence = number;
export type ServerTick = number;

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

export type OnlineMoveRequest = {
  type: "MOVE";
  payload: {
    direction: -1 | 1;
  };
};

export type OnlineAimRequest = {
  type: "AIM";
  payload: {
    angle: number;
    power: number;
  };
};

export type OnlineSelectProjectileSlotRequest = {
  type: "SELECT_PROJECTILE_SLOT";
  payload: {
    slot: number;
  };
};

export type OnlineFireRequest = {
  type: "FIRE";
  payload: {
    angle: number;
    power: number;
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

const ONLINE_STATE_DIFF_TYPES = new Set([
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

export type OnlineDiffResponseDto<
  TDiff extends OnlineStateDiffResponse = OnlineStateDiffResponse,
> = {
  gameSessionId: GameSessionId;
  sequence: DiffSequence;
  serverTick: ServerTick;
  type: TDiff["type"];
  intentId: IntentId | null;
  payload: TDiff["payload"];
};

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
    ONLINE_STATE_DIFF_TYPES.has(candidate.type) &&
    (typeof candidate.intentId === "string" || candidate.intentId === null) &&
    typeof candidate.payload === "object" &&
    candidate.payload !== null
  );
}

export type OnlineDiffBatchResponseDto = {
  gameSessionId: GameSessionId;
  sequence: DiffSequence;
  serverTick: ServerTick;
  intentId: IntentId | null;
  diffs: OnlineDiffResponseDto[];
};

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


export type OnlineInitialStateResponse = {
  type: "INITIAL_STATE";
  payload: {
    expectedNextDiffSequence: DiffSequence;
    localPlayerId: PlayerId;
    state: OnlineGameStateSnapshotResponse;
  };
};

export type OnlineResyncStateResponse = {
  type: "RESYNC_STATE";
  payload: {
    replacesSequence: DiffSequence;
    reason: "MISSED_DIFF" | "SERVER_CORRECTION" | "RECONNECT";
    localPlayerId: PlayerId;
    state: OnlineGameStateSnapshotResponse;
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
    angle: number;
    power: number;
  };
};

export type SubMunitionTrajectoryDto = {
  projectileDefinitionId: string;
  launch: OnlineVec2;
  trajectory: OnlineVec2[];
  impact: OnlineVec2;
  damagedTanks: OnlineTankDamageResponse[];
};

export type OnlineProjectileResolutionResponse = {
  type: "PROJECTILE_RESOLUTION";
  payload: {
    projectileEntityId: EntityId;
    ownerPlayerId: PlayerId;
    projectileDefinitionId: string;
    launch: OnlineVec2;
    trajectory: OnlineVec2[];
    impact: OnlineVec2;
    damagedTanks: OnlineTankDamageResponse[];
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
    reason:
      | "STALE_BASE_STATE"
      | "NOT_ACTIVE_PLAYER"
      | "INVALID_PAYLOAD"
      | "TURN_ALREADY_RESOLVING"
      | "INSUFFICIENT_FUEL"
      | "OUT_OF_BOUNDS"
      | "IMPASSABLE_TERRAIN";
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
    reason: "LAST_TANK_STANDING" | "DRAW" | "FORFEIT" | "MATCH_TIME_EXPIRED";
    finalState: OnlineGameStateSnapshotResponse;
  };
};

export type OnlineCrateSpawnedResponse = {
  type: "CRATE_SPAWNED";
  payload: {
    crateId: string;
    crateType: "hp" | "fuel" | "ammo";
    dropX: number;
    targetY: number;
    value: number;
  };
};

export type OnlineDamageTrailEvent = {
  id: string;
  position: OnlineVec2;
  radius: number;
  durationSeconds: number;
  damagePerSecond: number;
  ownerPlayerId: PlayerId;
};

export type OnlineVec2 = {
  x: number;
  y: number;
};

export type OnlineTankDamageResponse = {
  tankEntityId: EntityId;
  playerId: PlayerId;
  damage: number;
  remainingHealth: number;
};

export type OnlineLootCrateSnapshot = {
  crateId: string;
  crateType: "hp" | "fuel" | "ammo";
  x: number;
  y: number;
  targetY: number;
  isLanding: boolean;
  collected: boolean;
  value: number;
};

export type OnlineGameStateSnapshotResponse = {
  gameContentVersion: string;
  gameContent: GameContentResponseDto;
  match: {
    phase: "AIMING" | "BALLISTICS" | "IMPACT" | "TRANSITION" | "GAME_OVER";
    activePlayerId: PlayerId;
    playerCount: number;
    turnNumber: number;
    turnTimeRemainingTicks: number;
    winnerPlayerId: PlayerId | null;
    wind: number;
    matchTimeRemainingTicks: number;
    biome: "forest" | "desert" | "ice";
  };
  terrain: OnlineTerrainSnapshotResponse;
  tanks: OnlineTankSnapshotResponse[];
  projectiles: OnlineProjectileSnapshotResponse[];
  lootCrates: OnlineLootCrateSnapshot[];
  damageTrails: OnlineDamageTrailEvent[];
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

export type GameContentResponseDto = {
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
    playerASpawnRegion: { minX: number; maxX: number };
    playerBSpawnRegion: { minX: number; maxX: number };
    minWind: number;
    maxWind: number;
  };
  tanks: Record<
    string,
    {
      id: string;
      name: string;
      maxHealth: number;
      maxFuel: number;
      movementQuantum: number;
      fuelRate: number;
      climbCapability: number;
      width: number;
      height: number;
      visual: { fillStyle: string; strokeStyle: string; accentColor: string; label: string };
      loadout: string[];
    }
  >;
  projectiles: Record<
    string,
    {
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
      subMunitions: { count: number; projectileDefinitionId: string; spreadAngleDegrees: number; velocityScale: number } | null;
      damageTrail: { radius: number; damagePerSecond: number; durationSeconds: number } | null;
    }
  >;
};

export type OnlineTankSnapshotResponse = {
  entityId: EntityId;
  playerId: PlayerId;
  displayName: string;
  tankDefinitionId: string;
  width: number;
  height: number;
  visual: { fillStyle: string; strokeStyle: string; accentColor: string; label: string };
  position: OnlineVec2;
  facing: 1 | -1;
  aimAngle: number;
  power: number;
  selectedProjectileSlotId: string;
  loadout: string[];
  health: number;
  maxHealth: number;
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
