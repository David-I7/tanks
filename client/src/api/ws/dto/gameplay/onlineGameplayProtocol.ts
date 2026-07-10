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
    expectedNextDiffSequence: DiffSequence;
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
    intentId: IntentId;
    playerId: PlayerId;
    tankEntityId: EntityId;
    from: OnlineVec2;
    to: OnlineVec2;
    fuelBefore: number;
    fuelAfter: number;
    fuelSpent: number;
    startedServerTick: ServerTick;
    endedServerTick: ServerTick;
    durationTicks: number;
  };
};

export type OnlineProjectileResolutionDiff = {
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
    reason:
      | "STALE_BASE_STATE"
      | "NOT_ACTIVE_PLAYER"
      | "INVALID_PAYLOAD"
      | "TURN_ALREADY_RESOLVING"
      | "INSUFFICIENT_FUEL"
      | "OUT_OF_BOUNDS";
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
  loadout: OnlineProjectileSlotSnapshot[];
  health: number;
  maxHealth: number;
  fuel: number;
  alive: boolean;
};

export type OnlineProjectileSlotSnapshot = {
  id: string;
  projectileDefinitionId: string;
  label: string;
  renderAssetId: string;
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
        fuelBefore: 100,
        fuelAfter: 95,
        fuelSpent: 5,
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
  playerIntent: OnlinePlayerIntentEnvelope;
  diffs: OnlineDiffEnvelope[];
};
