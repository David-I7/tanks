import type {
  DiffSequence,
  OnlineDiffEnvelope,
  OnlineGameStateSnapshot,
  ServerTick,
} from "../../api/ws/dto/gameplay/onlineGameplayProtocol";

export type PendingPrediction = {
  intentId: string;
  baseDiffSequence: DiffSequence;
  baseDiffServerTick: ServerTick;
};

export type OnlineConfirmedState = {
  gameSessionId: string;
  state: OnlineGameStateSnapshot;
  lastConfirmedDiffSequence: DiffSequence;
  lastConfirmedDiffServerTick: ServerTick;
  expectedNextDiffSequence: DiffSequence;
  pendingPredictions: PendingPrediction[];
};

export function initializeOnlineConfirmedState(
  diff: OnlineDiffEnvelope,
): OnlineConfirmedState {
  if (diff.type !== "INITIAL_STATE") {
    throw new Error(`Expected INITIAL_STATE diff, received ${diff.type}`);
  }

  const payload = diff.payload as Extract<
    OnlineDiffEnvelope["payload"],
    { expectedNextDiffSequence: DiffSequence }
  >;

  return {
    gameSessionId: diff.gameSessionId,
    state: payload.state,
    lastConfirmedDiffSequence: diff.sequence,
    lastConfirmedDiffServerTick: diff.serverTick,
    expectedNextDiffSequence: payload.expectedNextDiffSequence,
    pendingPredictions: [],
  };
}
