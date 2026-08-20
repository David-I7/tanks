import type { GameContent } from "../rendering/ResourceManager";
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

import { IntentThrottler } from "../online/IntentThrottler";

export function createLocalGameManager(options: {
  mode: Exclude<GameMode, "online">;
  setup: MatchSetup;
  content: GameContent;
}): GameManager {
  return new LocalGameManager(
    createLocalSimulationManager({
      mode: options.mode,
      setup: options.setup,
      content: options.content,
    }),
    options.content.projectiles,
  );
}

class LocalGameManager implements GameManager {
  private currentState: GameState;
  private readonly listeners = new Set<(state: GameState) => void>();
  private readonly unsubscribeSimulation: () => void;
  private readonly moveThrottler = new IntentThrottler({
    aimIntervalMs: 0,
    moveIntervalMs: 100,
  });

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
        const previousActivePlayerId = this.currentState.match.activePlayerId;
        this.currentState = toGameState(
          simulationState,
          this.projectileDefinitions,
        );
        if (this.currentState.match.activePlayerId !== previousActivePlayerId) {
          this.moveThrottler.reset();
        }
        this.publishCurrentState();
      },
    );
  }

  submitAction(action: GameAction): boolean {
    if (action.type === "panCamera" || action.type === "relockCamera") {
      return this.simulationManager.submitPlayerAction(0, action);
    }
    const playerId = resolveActiveLocalActor(this.currentState);
    if (playerId === null) return false;

    if (action.type === "move") {
      const nowMs =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      if (!this.moveThrottler.shouldSendMove(nowMs)) {
        return false;
      }
    }

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
