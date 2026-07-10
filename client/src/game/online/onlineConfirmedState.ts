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

export type OnlineDiffSequenceErrorKind = "MISSING_DIFF" | "OUT_OF_ORDER_DIFF";

export class OnlineDiffSequenceError extends Error {
  readonly kind: OnlineDiffSequenceErrorKind;

  constructor(
    readonly expectedSequence: DiffSequence,
    readonly receivedSequence: DiffSequence,
  ) {
    const kind = receivedSequence > expectedSequence ? "MISSING_DIFF" : "OUT_OF_ORDER_DIFF";
    super(`Expected online state diff ${expectedSequence}, received ${receivedSequence}`);
    this.name = "OnlineDiffSequenceError";
    this.kind = kind;
  }
}

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

export function applyOnlineStateDiff(
  confirmed: OnlineConfirmedState,
  diff: OnlineDiffEnvelope,
): OnlineConfirmedState {
  if (diff.sequence !== confirmed.expectedNextDiffSequence) {
    throw new OnlineDiffSequenceError(confirmed.expectedNextDiffSequence, diff.sequence);
  }

  const nextConfirmed = {
    ...confirmed,
    lastConfirmedDiffSequence: diff.sequence,
    lastConfirmedDiffServerTick: diff.serverTick,
    expectedNextDiffSequence: diff.sequence + 1,
  };

  if (diff.intentId === null) {
    return nextConfirmed;
  }

  return {
    ...nextConfirmed,
    pendingPredictions: nextConfirmed.pendingPredictions.filter(
      (prediction) => prediction.intentId !== diff.intentId,
    ),
  };
}
