import type { GameContent } from "../content/mockGameContent";
import type { GameViewport } from "../world/worldSizing";
import {
  createDefaultMatchSetup,
  createInitialWorld,
} from "../world/createInitialWorld";
import { LocalSimulationAuthority } from "../simulation/LocalSimulationAuthority";
import type {
  GameAction,
  GameMode,
  GameSnapshot,
  MatchSetup,
  SimulationState,
} from "../types";

export type SimulationManager = {
  submitPlayerAction(playerId: number, action: GameAction): boolean;
  update(dt: number): void;
  getState(): SimulationState;
  subscribe(listener: (state: SimulationState) => void): () => void;
  destroy(): void;
};

export type SimulationAuthority = {
  submitPlayerAction(playerId: number, action: GameAction): boolean;
  update(dt: number): void;
  snapshot(): GameSnapshot | null;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
  destroy(): void;
};

export function createLocalSimulationAuthority(options: {
  mode?: GameMode;
  setup?: MatchSetup;
  content: GameContent;
  initialGameViewport: GameViewport;
}): SimulationAuthority {
  const localAuthority = createLocalSimulationRuntime(options);
  const listeners = new Set<(snapshot: GameSnapshot) => void>();
  const publishSnapshot = () => {
    const snapshot = localAuthority.snapshot();
    for (const listener of listeners) listener(snapshot);
  };
  return {
    submitPlayerAction(playerId: number, action: GameAction): boolean {
      const accepted = localAuthority.submitPlayerAction(playerId, action);
      if (accepted) publishSnapshot();
      return accepted;
    },
    update(dt: number): void {
      localAuthority.update(dt);
      publishSnapshot();
    },
    snapshot(): GameSnapshot {
      return localAuthority.snapshot();
    },
    subscribe(listener: (snapshot: GameSnapshot) => void): () => void {
      listeners.add(listener);
      listener(localAuthority.snapshot());
      return () => listeners.delete(listener);
    },
    destroy(): void {
      listeners.clear();
    },
  };
}

export function createLocalSimulationManager(
  options: Parameters<typeof createLocalSimulationAuthority>[0],
): SimulationManager {
  return new CachedLocalSimulationManager(createLocalSimulationRuntime(options));
}

function snapshotToSimulationState(snapshot: GameSnapshot): SimulationState {
  const { projectileDefinitions: _projectileDefinitions, ...state } = snapshot;
  return state;
}

function createLocalSimulationRuntime(options: {
  mode?: GameMode;
  setup?: MatchSetup;
  content: GameContent;
  initialGameViewport: GameViewport;
}): LocalSimulationAuthority {
  const setup =
    options.setup ?? createDefaultMatchSetup(options.mode ?? "localTwoPlayer");
  const { world, terrain, content } = createInitialWorld(
    setup,
    options.content,
    options.initialGameViewport,
  );
  return new LocalSimulationAuthority(world, terrain, content);
}

class CachedLocalSimulationManager implements SimulationManager {
  private currentState: SimulationState;
  private readonly listeners = new Set<(state: SimulationState) => void>();

  constructor(private readonly localAuthority: LocalSimulationAuthority) {
    this.currentState = snapshotToSimulationState(localAuthority.snapshot());
  }

  submitPlayerAction(playerId: number, action: GameAction): boolean {
    const accepted = this.localAuthority.submitPlayerAction(playerId, action);
    if (accepted) this.publishCurrentState();
    return accepted;
  }

  update(dt: number): void {
    this.localAuthority.update(dt);
    this.publishCurrentState();
  }

  getState(): SimulationState {
    return this.currentState;
  }

  subscribe(listener: (state: SimulationState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.listeners.clear();
  }

  private publishCurrentState(): void {
    this.currentState = snapshotToSimulationState(this.localAuthority.snapshot());
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}
