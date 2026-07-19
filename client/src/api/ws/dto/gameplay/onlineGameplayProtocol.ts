export type GameSessionId = string;
export type PlayerId = number;
export type EntityId = number;
export type IntentId = string;
export type DiffSequence = number;
export type ServerTick = number;

export type OnlinePlayerIntentRequest =
  | OnlineMoveRequest
  | OnlineSelectProjectileSlotRequest
  | OnlineFireRequest;

export type OnlinePlayerIntentRequestDto<
  TIntent extends OnlinePlayerIntentRequest = OnlinePlayerIntentRequest,
> = {
  protocolVersion?: string;
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

export type OnlineSelectProjectileSlotRequest = {
  type: "SELECT_PROJECTILE_SLOT";
  payload: {
    projectileSlotId: string;
  };
};

export type OnlineFireRequest = {
  type: "FIRE";
  payload: {
    angle: number;
    power: number;
    projectileSlotId: string;
  };
};

export type OnlineStateDiffResponse =
  | OnlineInitialStateResponse
  | OnlineResyncStateResponse
  | OnlineMovementSegmentResponse
  | OnlineProjectileResolutionResponse
  | OnlineTerrainPatchResponse
  | OnlineIntentRejectionResponse
  | OnlineTurnTransitionResponse
  | OnlineTerminalGameResponse;

const ONLINE_STATE_DIFF_TYPES = new Set([
  "INITIAL_STATE",
  "RESYNC_STATE",
  "MOVEMENT_SEGMENT",
  "PROJECTILE_RESOLUTION",
  "TERRAIN_PATCH",
  "INTENT_REJECTION",
  "TURN_TRANSITION",
  "TERMINAL_GAME",
]);

export type OnlineDiffResponseDto<
  TDiff extends OnlineStateDiffResponse = OnlineStateDiffResponse,
> = {
  protocolVersion?: string;
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
    intentId: IntentId | null;
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

export type OnlineProjectileResolutionResponse = {
  type: "PROJECTILE_RESOLUTION";
  payload: {
    intentId: IntentId;
    projectileEntityId: EntityId;
    ownerPlayerId: PlayerId;
    projectileDefinitionId: string;
    projectileRenderAssetId: string;
    impactRenderAssetId: string;
    launch: OnlineVec2;
    trajectory: OnlineVec2[];
    impact: OnlineVec2;
    damagedTanks: OnlineTankDamageResponse[];
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
    rejectedIntentId: IntentId;
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
  };
};

export type OnlineTerminalGameResponse = {
  type: "TERMINAL_GAME";
  payload: {
    winnerPlayerId: PlayerId | null;
    reason: "LAST_TANK_STANDING" | "DRAW" | "FORFEIT";
    finalState: OnlineGameStateSnapshotResponse;
  };
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
  };
  terrain: OnlineTerrainSnapshotResponse;
  tanks: OnlineTankSnapshotResponse[];
  projectiles: OnlineProjectileSnapshotResponse[];
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
    width: number;
    height: number;
    bedrockDepth: number;
    tickRateHz: number;
    gravity: number;
    projectileTimeStepSeconds: number;
    maxProjectileSteps: number;
    movementSegmentDurationTicks: number;
    playerASpawnRegion: { minX: number; maxX: number };
    playerBSpawnRegion: { minX: number; maxX: number };
  };
  tanks: Record<
    string,
    {
      id: string;
      name: string;
      renderAssetId: string;
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
      loadout: OnlineProjectileSlotSnapshotResponse[];
    }
  >;
  projectiles: Record<
    string,
    {
      id: string;
      name: string;
      renderAssetId: string;
      radius: number;
      baseVelocity: number;
      gravityScale: number;
      drag: number;
      muzzleVelocityScale: number;
      terrainEffectType: "CRATER" | "DRILL";
      terrainRadius: number;
      terrainDepth: number;
      damageEffectType: "RADIAL" | "FOCUSED";
      damageRadius: number;
      damage: number;
      impactRenderAssetId: string;
      impactDuration: number;
    }
  >;
};

export type OnlineTankSnapshotResponse = {
  entityId: EntityId;
  playerId: PlayerId;
  displayName: string;
  tankDefinitionId: string;
  renderAssetId: string;
  position: OnlineVec2;
  facing: 1 | -1;
  aimAngle: number;
  power: number;
  selectedProjectileSlotId: string;
  loadout: OnlineProjectileSlotSnapshotResponse[];
  health: number;
  maxHealth: number;
  fuel: number;
  alive: boolean;
};

export type OnlineProjectileSlotSnapshotResponse = {
  id: string;
  projectileDefinitionId: string;
  label: string;
  renderAssetId: string;
};

export type OnlineProjectileSnapshotResponse = {
  entityId: EntityId;
  ownerPlayerId: PlayerId;
  projectileDefinitionId: string;
  renderAssetId: string;
  position: OnlineVec2;
  velocity: OnlineVec2;
};

const exampleState: OnlineGameStateSnapshotResponse = {
  gameContentVersion: "game-content.v1",
  gameContent: {
    version: "game-content.v1",
    world: {
      width: 4,
      height: 3,
      bedrockDepth: 1,
      tickRateHz: 30,
      gravity: 500,
      projectileTimeStepSeconds: 1 / 30,
      maxProjectileSteps: 180,
      movementSegmentDurationTicks: 6,
      playerASpawnRegion: { minX: 0, maxX: 1 },
      playerBSpawnRegion: { minX: 2, maxX: 3 },
    },
    tanks: {},
    projectiles: {},
  },
  match: {
    phase: "AIMING",
    activePlayerId: 1,
    playerCount: 2,
    turnNumber: 1,
    turnTimeRemainingTicks: 900,
    winnerPlayerId: null,
  },
  terrain: {
    kind: "HEIGHTMAP",
    width: 4,
    height: 3,
    surface: [2, 2, 1, 2],
  },
  tanks: [
    {
      entityId: 10,
      playerId: 1,
      displayName: "Player 1",
      tankDefinitionId: "vanguard",
      renderAssetId: "tank.vanguard",
      position: { x: 50, y: 120 },
      facing: 1,
      aimAngle: 45,
      power: 0.5,
      selectedProjectileSlotId: "standard",
      loadout: [
        {
          id: "standard",
          projectileDefinitionId: "basicShell",
          label: "Std",
          renderAssetId: "projectile-slot.standard",
        },
      ],
      health: 110,
      maxHealth: 110,
      fuel: 100,
      alive: true,
    },
  ],
  projectiles: [],
};

export const onlineGameplayProtocolExamples = {
  playerIntent: {
    protocolVersion: "online-gameplay.v1",
    gameSessionId: "game-123",
    playerId: 1,
    intentId: "intent-abc",
    lastConfirmedDiffSequence: 7,
    lastConfirmedDiffServerTick: 210,
    type: "FIRE",
    payload: {
      angle: 42,
      power: 0.75,
      projectileSlotId: "standard",
    },
  },
  diffs: [
    {
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      sequence: 1,
      serverTick: 0,
      type: "INITIAL_STATE",
      intentId: null,
      payload: {
        expectedNextDiffSequence: 2,
        localPlayerId: 1,
        state: exampleState,
      },
    },
    {
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      sequence: 2,
      serverTick: 30,
      type: "RESYNC_STATE",
      intentId: null,
      payload: {
        replacesSequence: 1,
        reason: "MISSED_DIFF",
        localPlayerId: 1,
        state: exampleState,
      },
    },
    {
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      sequence: 3,
      serverTick: 60,
      type: "MOVEMENT_SEGMENT",
      intentId: "intent-move",
      payload: {
        intentId: "intent-move",
        playerId: 1,
        tankEntityId: 10,
        from: { x: 50, y: 120 },
        to: { x: 55, y: 120 },
        movementPath: [
          { x: 50, y: 120 },
          { x: 55, y: 120 },
        ],
        fuelBefore: 100,
        fuelAfter: 95,
        fuelSpent: 5,
        partial: false,
        startedServerTick: 60,
        endedServerTick: 75,
        durationTicks: 15,
      },
    },
    {
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      sequence: 4,
      serverTick: 90,
      type: "PROJECTILE_RESOLUTION",
      intentId: "intent-fire",
      payload: {
        intentId: "intent-fire",
        projectileEntityId: 20,
        ownerPlayerId: 1,
        projectileDefinitionId: "basicShell",
        projectileRenderAssetId: "projectile.basic-shell",
        impactRenderAssetId: "impact.orange-pop",
        launch: { x: 55, y: 110 },
        trajectory: [
          { x: 55, y: 110 },
          { x: 120, y: 130 },
        ],
        impact: { x: 120, y: 130 },
        damagedTanks: [
          {
            tankEntityId: 11,
            playerId: 2,
            damage: 35,
            remainingHealth: 65,
          },
        ],
      },
    },
    {
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      sequence: 5,
      serverTick: 90,
      type: "TERRAIN_PATCH",
      intentId: null,
      payload: {
        patches: [
          {
            kind: "HEIGHTMAP_RANGE",
            startX: 2,
            surface: [1, 1, 2],
          },
        ],
      },
    },
    {
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      sequence: 6,
      serverTick: 120,
      type: "INTENT_REJECTION",
      intentId: "intent-stale",
      payload: {
        rejectedIntentId: "intent-stale",
        playerId: 1,
        reason: "STALE_BASE_STATE",
        authoritativeSequence: 6,
        authoritativeServerTick: 120,
      },
    },
    {
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      sequence: 7,
      serverTick: 150,
      type: "TURN_TRANSITION",
      intentId: null,
      payload: {
        previousPlayerId: 1,
        activePlayerId: 2,
        turnNumber: 2,
        phase: "AIMING",
        turnEndsAtServerTick: 1050,
      },
    },
    {
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      sequence: 8,
      serverTick: 180,
      type: "TERMINAL_GAME",
      intentId: null,
      payload: {
        winnerPlayerId: 1,
        reason: "LAST_TANK_STANDING",
        finalState: exampleState,
      },
    },
  ],
} satisfies {
  playerIntent: OnlinePlayerIntentRequestDto;
  diffs: OnlineDiffResponseDto[];
};
