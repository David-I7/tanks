import ResourceManager, {
  type GameContent,
} from "../rendering/ResourceManager";
import { createCanvasSizing, readDomCanvasRect } from "../world/worldSizing";
import { createDefaultMatchSetup } from "../world/createInitialWorld";
import {
  createLocalSimulationManager,
  type LocalSimulationManager as SimulationManager,
} from "../simulation/simulationManager";
import type {
  GameAction,
  GameMode,
  GameState,
  MatchSetup,
  LocalSimulationState,
} from "../types";
import type { GameManager } from "./gameManager";

export function createLocalGameManager(options: {
  canvas: HTMLCanvasElement;
  mode: Exclude<GameMode, "online">;
  setup: MatchSetup;
  content: GameContent;
}): GameManager {
  const gameViewport = createCanvasSizing({
    domCanvasRect: readDomCanvasRect(options.canvas),
    devicePixelRatio:
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
  }).gameViewport;

  return new LocalGameManager(
    createLocalSimulationManager({
      mode: options.mode,
      setup: options.setup,
      content: options.content,
      initialGameViewport: gameViewport,
    }),
    options.content.projectiles,
  );
}

export function createCanvasSizedLocalGameManager(options: {
  canvas: HTMLCanvasElement;
  mode: Exclude<GameMode, "online">;
}): GameManager {
  return createLocalGameManager({
    canvas: options.canvas,
    mode: options.mode,
    setup: createDefaultMatchSetup(options.mode),
    content: ResourceManager.getInstance().getGameContent(),
  });
}

class LocalGameManager implements GameManager {
  private currentState: GameState;
  private readonly listeners = new Set<(state: GameState) => void>();
  private readonly unsubscribeSimulation: () => void;

  constructor(
    private readonly simulationManager: SimulationManager,
    private readonly projectileDefinitions: GameState["projectileDefinitions"],
  ) {
    this.currentState = toGameState(
      simulationManager.getState(),
      projectileDefinitions,
    );
    this.unsubscribeSimulation = simulationManager.subscribe(
      (simulationState) => {
        this.currentState = toGameState(
          simulationState,
          this.projectileDefinitions,
        );
        this.publishCurrentState();
      },
    );
  }

  submitAction(action: GameAction): boolean {
    const playerId = resolveActiveLocalActor(this.currentState);
    if (playerId === null) return false;
    return this.simulationManager.submitPlayerAction(playerId, action);
  }

  update(dt: number): void {
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

export function toGameState(
  state: LocalSimulationState,
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
    damageTrails: state.damageTrails,
    lootCrates: state.lootCrates,
    particles: state.particles,
    floatingTexts: state.floatingTexts,
    decors: state.decors,
    clouds: state.clouds,
  };
}

function resolveActiveLocalActor(state: GameState): number | null {
  const activeTank = state.tanks.find(
    (entry) => entry.playerId === state.match.activePlayerId,
  );

  if (!activeTank) return null;
  if (activeTank.controllerKind !== "human") return null;
  return activeTank.playerId;
}
