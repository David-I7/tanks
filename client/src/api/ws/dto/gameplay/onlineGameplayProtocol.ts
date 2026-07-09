export type OnlineGameplayProtocolVersion = "online-gameplay.v1";

export type GameSessionId = string;
export type PlayerId = number;
export type EntityId = number;
export type IntentId = string;
export type DiffSequence = number;
export type ServerTick = number;

export type OnlinePlayerIntent =
  | OnlineMoveIntent
  | OnlineAimIntent
  | OnlineSelectProjectileSlotIntent
  | OnlineFireIntent;

export type OnlinePlayerIntentEnvelope<TIntent extends OnlinePlayerIntent = OnlinePlayerIntent> = {
  protocolVersion: OnlineGameplayProtocolVersion;
  gameSessionId: GameSessionId;
  playerId: PlayerId;
  intentId: IntentId;
  lastConfirmedDiffSequence: DiffSequence;
  lastConfirmedDiffServerTick: ServerTick;
  type: TIntent["type"];
  payload: TIntent["payload"];
};

export type OnlineMoveIntent = {
  type: "MOVE";
  payload: {
    direction: -1 | 0 | 1;
  };
};

export type OnlineAimIntent = {
  type: "AIM";
  payload: {
    angle: number;
    power: number;
  };
};

export type OnlineSelectProjectileSlotIntent = {
  type: "SELECT_PROJECTILE_SLOT";
  payload: {
    projectileSlotId: string;
  };
};

export type OnlineFireIntent = {
  type: "FIRE";
  payload: {
    angle: number;
    power: number;
    projectileSlotId: string;
  };
};

export type OnlineStateDiff =
  | OnlineInitialStateDiff
  | OnlineResyncStateDiff
  | OnlineMovementSegmentDiff
  | OnlineProjectileResolutionDiff
  | OnlineTerrainPatchDiff
  | OnlineIntentRejectionDiff
  | OnlineTurnTransitionDiff
  | OnlineTerminalGameDiff;

export type OnlineDiffEnvelope<TDiff extends OnlineStateDiff = OnlineStateDiff> = {
  protocolVersion: OnlineGameplayProtocolVersion;
  gameSessionId: GameSessionId;
  sequence: DiffSequence;
  serverTick: ServerTick;
  type: TDiff["type"];
  intentId: IntentId | null;
  payload: TDiff["payload"];
};

export type OnlineInitialStateDiff = {
  type: "INITIAL_STATE";
  payload: {
    state: OnlineGameStateSnapshot;
  };
};

export type OnlineResyncStateDiff = {
  type: "RESYNC_STATE";
  payload: {
    replacesSequence: DiffSequence;
    reason: "MISSED_DIFF" | "SERVER_CORRECTION" | "RECONNECT";
    state: OnlineGameStateSnapshot;
  };
};

export type OnlineMovementSegmentDiff = {
  type: "MOVEMENT_SEGMENT";
  payload: {
    playerId: PlayerId;
    tankEntityId: EntityId;
    from: OnlineVec2;
    to: OnlineVec2;
    startedServerTick: ServerTick;
    endedServerTick: ServerTick;
  };
};

export type OnlineProjectileResolutionDiff = {
  type: "PROJECTILE_RESOLUTION";
  payload: {
    projectileEntityId: EntityId;
    ownerPlayerId: PlayerId;
    projectileDefinitionId: string;
    projectileRenderAssetId: string;
    impactRenderAssetId: string;
    launch: OnlineVec2;
    impact: OnlineVec2;
    damagedTanks: OnlineTankDamage[];
  };
};

export type OnlineTerrainPatchDiff = {
  type: "TERRAIN_PATCH";
  payload: {
    patches: OnlineTerrainPatch[];
  };
};

export type OnlineIntentRejectionDiff = {
  type: "INTENT_REJECTION";
  payload: {
    rejectedIntentId: IntentId;
    playerId: PlayerId;
    reason: "STALE_BASE_STATE" | "NOT_ACTIVE_PLAYER" | "INVALID_PAYLOAD" | "TURN_ALREADY_RESOLVING";
    authoritativeSequence: DiffSequence;
    authoritativeServerTick: ServerTick;
  };
};

export type OnlineTurnTransitionDiff = {
  type: "TURN_TRANSITION";
  payload: {
    previousPlayerId: PlayerId;
    activePlayerId: PlayerId;
    turnNumber: number;
    phase: "AIMING";
    turnEndsAtServerTick: ServerTick;
  };
};

export type OnlineTerminalGameDiff = {
  type: "TERMINAL_GAME";
  payload: {
    winnerPlayerId: PlayerId | null;
    reason: "LAST_TANK_STANDING" | "DRAW" | "FORFEIT";
    finalState: OnlineGameStateSnapshot;
  };
};

export type OnlineVec2 = {
  x: number;
  y: number;
};

export type OnlineTankDamage = {
  tankEntityId: EntityId;
  playerId: PlayerId;
  damage: number;
  remainingHealth: number;
};

export type OnlineGameStateSnapshot = {
  gameplayDefinitionVersion: string;
  match: {
    phase: "AIMING" | "BALLISTICS" | "IMPACT" | "TRANSITION" | "GAME_OVER";
    activePlayerId: PlayerId;
    playerCount: number;
    turnNumber: number;
    turnTimeRemainingTicks: number;
    winnerPlayerId: PlayerId | null;
  };
  terrain: OnlineTerrainSnapshot;
  tanks: OnlineTankSnapshot[];
  projectiles: OnlineProjectileSnapshot[];
};

export type OnlineTerrainSnapshot =
  | {
      kind: "HEIGHTMAP";
      width: number;
      height: number;
      surface: number[];
    }
  | {
      kind: "MASK";
      width: number;
      height: number;
      solidBase64: string;
    };

export type OnlineTerrainPatch =
  | {
      kind: "HEIGHTMAP_RANGE";
      startX: number;
      surface: number[];
    }
  | {
      kind: "MASK_RECT";
      x: number;
      y: number;
      width: number;
      height: number;
      solidBase64: string;
    };

export type OnlineTankSnapshot = {
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
  health: number;
  maxHealth: number;
  fuel: number;
  alive: boolean;
};

export type OnlineProjectileSnapshot = {
  entityId: EntityId;
  ownerPlayerId: PlayerId;
  projectileDefinitionId: string;
  renderAssetId: string;
  position: OnlineVec2;
  velocity: OnlineVec2;
};

const exampleState: OnlineGameStateSnapshot = {
  gameplayDefinitionVersion: "online-gameplay-definitions.v1",
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
        state: exampleState,
      },
    },
    {
      protocolVersion: "online-gameplay.v1",
      gameSessionId: "game-123",
      sequence: 8,
      serverTick: 240,
      type: "INTENT_REJECTION",
      intentId: "intent-abc",
      payload: {
        rejectedIntentId: "intent-abc",
        playerId: 1,
        reason: "STALE_BASE_STATE",
        authoritativeSequence: 9,
        authoritativeServerTick: 270,
      },
    },
  ],
} satisfies {
  playerIntent: OnlinePlayerIntentEnvelope;
  diffs: OnlineDiffEnvelope[];
};
