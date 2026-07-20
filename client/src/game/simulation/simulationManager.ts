import type { GameContent } from "../content/localGameContent";
import type { GameViewport } from "../world/worldSizing";
import { createLocalInitialWorld } from "../world/createInitialWorld";
import { LocalSimulation } from "./LocalSimulation";
import type {
  GameAction,
  GameMode,
  MatchSetup,
  LocalSimulationState,
} from "../types";

export function createLocalSimulationManager(options: {
  mode: GameMode;
  setup: MatchSetup;
  content: GameContent;
  initialGameViewport: GameViewport;
}): LocalSimulationManager {
  return new LocalSimulationManager(createLocalSimulation(options));
}

function createLocalSimulation(options: {
  mode: GameMode;
  setup: MatchSetup;
  content: GameContent;
  initialGameViewport: GameViewport;
}): LocalSimulation {
  const { world, terrain, content } = createLocalInitialWorld(
    options.setup,
    options.content,
    options.initialGameViewport,
  );
  return new LocalSimulation(world, terrain, content);
}

export class LocalSimulationManager {
  private currentState: LocalSimulationState;
  private readonly listeners = new Set<(state: LocalSimulationState) => void>();

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

  getState(): LocalSimulationState {
    return this.currentState;
  }

  subscribe(listener: (state: LocalSimulationState) => void): () => void {
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
