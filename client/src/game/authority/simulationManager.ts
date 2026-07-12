import type { GameContent } from "../content/mockGameContent";
import type { GameViewport } from "../world/worldSizing";
import {
  createDefaultMatchSetup,
  createInitialWorld,
} from "../world/createInitialWorld";
import { LocalSimulation } from "../simulation/LocalSimulation";
import type {
  GameAction,
  GameMode,
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

export function createLocalSimulationManager(options: {
  mode?: GameMode;
  setup?: MatchSetup;
  content: GameContent;
  initialGameViewport: GameViewport;
}): SimulationManager {
  return new CachedLocalSimulationManager(createLocalSimulation(options));
}

function createLocalSimulation(options: {
  mode?: GameMode;
  setup?: MatchSetup;
  content: GameContent;
  initialGameViewport: GameViewport;
}): LocalSimulation {
  const setup =
    options.setup ?? createDefaultMatchSetup(options.mode ?? "localTwoPlayer");
  const { world, terrain, content } = createInitialWorld(
    setup,
    options.content,
    options.initialGameViewport,
  );
  return new LocalSimulation(world, terrain, content);
}

class CachedLocalSimulationManager implements SimulationManager {
  private currentState: SimulationState;
  private readonly listeners = new Set<(state: SimulationState) => void>();

  constructor(private readonly localSimulation: LocalSimulation) {
    this.currentState = localSimulation.getState();
  }

  submitPlayerAction(playerId: number, action: GameAction): boolean {
    const accepted = this.localSimulation.submitPlayerAction(playerId, action);
    if (accepted) this.publishCurrentState();
    return accepted;
  }

  update(dt: number): void {
    this.localSimulation.update(dt);
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
    this.currentState = this.localSimulation.getState();
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}
