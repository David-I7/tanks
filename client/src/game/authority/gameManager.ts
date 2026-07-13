import { mockGameContent, type GameContent } from "../content/mockGameContent";
import { createCanvasSizing, readDomCanvasRect, type GameViewport } from "../world/worldSizing";
import { createDefaultMatchSetup } from "../world/createInitialWorld";
import { AiIntentSource } from "../input/AiIntentSource";
import {
  createLocalSimulationManager,
  type SimulationManager,
} from "./simulationManager";
import type {
  GameAction,
  GameMode,
  GameState,
  MatchSetup,
  SimulationState,
} from "../types";

export type GameManager = {
  submitAction(action: GameAction): boolean;
  update(dt: number): void;
  getState(): GameState;
  subscribe(listener: (state: GameState) => void): () => void;
  destroy(): void;
};

export function createCanvasSizedLocalGameManager(options: {
  canvas: HTMLCanvasElement;
  mode: Exclude<GameMode, "online">;
  setup?: MatchSetup;
  content?: GameContent;
}): GameManager {
  const sizing = createCanvasSizing({
    domCanvasRect: readDomCanvasRect(options.canvas),
    devicePixelRatio: window.devicePixelRatio || 1,
  });
  const content = options.content ?? mockGameContent;

  return createLocalGameManager({
    mode: options.mode,
    setup: options.setup ?? createDefaultMatchSetup(options.mode),
    content,
    initialGameViewport: sizing.gameViewport,
  });
}

export function createLocalGameManager(options: {
  mode: Exclude<GameMode, "online">;
  setup?: MatchSetup;
  content: GameContent;
  initialGameViewport: GameViewport;
}): GameManager {
  return new CachedLocalGameManager(
    createLocalSimulationManager(options),
    options.content.projectiles,
  );
}

class CachedLocalGameManager implements GameManager {
  private currentState: GameState;
  private readonly aiInput = new AiIntentSource();
  private readonly listeners = new Set<(state: GameState) => void>();
  private readonly unsubscribeSimulation: () => void;

  constructor(
    private readonly simulationManager: SimulationManager,
    private readonly projectileDefinitions: GameState["projectileDefinitions"],
  ) {
    this.currentState = simulationStateToGameState(
      simulationManager.getState(),
      projectileDefinitions,
    );
    this.unsubscribeSimulation = simulationManager.subscribe(
      (simulationState) => {
        this.currentState = simulationStateToGameState(
          simulationState,
          this.projectileDefinitions,
        );
        this.publishCurrentState();
      },
    );
  }

  submitAction(action: GameAction): boolean {
    const playerId = resolveActiveLocalActor(this.currentState, "human");
    if (playerId === null) return false;
    return this.simulationManager.submitPlayerAction(playerId, action);
  }

  update(dt: number): void {
    const activePlayerId = this.currentState.match.activePlayerId;
    const activeControllerKind = this.currentState.tanks.find(
      (entry) => entry.playerId === activePlayerId,
    )?.controllerKind;

    if (activeControllerKind === "ai") {
      for (const action of this.aiInput.poll(this.currentState, dt)) {
        this.simulationManager.submitPlayerAction(activePlayerId, action);
      }
    }

    this.simulationManager.update(dt);
  }

  getState(): GameState {
    return this.currentState;
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.unsubscribeSimulation();
    this.simulationManager.destroy();
    this.listeners.clear();
  }

  private publishCurrentState(): void {
    for (const listener of this.listeners) {
      listener(this.currentState);
    }
  }
}

export function simulationStateToGameState(
  state: SimulationState,
  projectileDefinitions: GameState["projectileDefinitions"],
): GameState {
  return {
    match: state.match,
    terrain: state.terrain,
    projectileDefinitions,
    tanks: state.tanks.map((entry) => ({
      ...entry.tank,
      entityId: entry.entityId,
      position: entry.position,
    })),
    projectiles: state.projectiles.map((entry) => ({
      ...entry.projectile,
      entityId: entry.entityId,
      position: entry.position,
      velocity: entry.velocity,
    })),
    impactEvents: state.impactEvents,
  };
}

function resolveActiveLocalActor(
  state: GameState,
  source: "human" | "ai",
): number | null {
  const activeTank = state.tanks.find(
    (entry) => entry.playerId === state.match.activePlayerId,
  );

  if (!activeTank) return null;
  if (activeTank.controllerKind !== source) return null;
  return activeTank.playerId;
}
