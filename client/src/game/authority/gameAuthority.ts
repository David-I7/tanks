import type { GameContent } from "../content/mockGameContent";
import type { WorldSize } from "../world/worldSizing";
import {
  createLocalSimulationAuthority,
  createLocalSimulationManager,
  type SimulationAuthority,
  type SimulationManager,
} from "./simulationAuthority";
import type {
  GameAction,
  ControllerKind,
  GameMode,
  GameSnapshot,
  GameState,
  GameViewState,
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

export type GameAuthority = {
  submitAction(action: GameAction, source?: LocalActionSource): boolean;
  update(dt: number): void;
  getViewState(): GameViewState | null;
  subscribe(listener: (state: GameViewState) => void): () => void;
  destroy(): void;
};

export type LocalActionSource = Extract<ControllerKind, "human" | "ai">;

export function snapshotToGameViewState(snapshot: GameSnapshot): GameViewState {
  return {
    match: { ...snapshot.match },
    terrain:
      snapshot.terrain.kind === "heightmap"
        ? { ...snapshot.terrain, surface: [...snapshot.terrain.surface] }
        : { ...snapshot.terrain, solid: new Uint8Array(snapshot.terrain.solid) },
    projectileDefinitions: Object.fromEntries(
      Object.entries(snapshot.projectileDefinitions).map(([id, definition]) => [
        id,
        {
          ...definition,
          physics: { ...definition.physics },
          terrainEffect: { ...definition.terrainEffect },
          damageEffect: { ...definition.damageEffect },
          visual: { ...definition.visual },
        },
      ]),
    ),
    tanks: snapshot.tanks.map((entry) => ({
      ...entry.tank,
      entityId: entry.entityId,
      position: { ...entry.position },
      visual: { ...entry.tank.visual },
      loadout: entry.tank.loadout.map((slot) => ({ ...slot })),
    })),
    projectiles: snapshot.projectiles.map((entry) => ({
      ...entry.projectile,
      entityId: entry.entityId,
      position: { ...entry.position },
      velocity: { ...entry.velocity },
      physics: { ...entry.projectile.physics },
      terrainEffect: { ...entry.projectile.terrainEffect },
      damageEffect: { ...entry.projectile.damageEffect },
      visual: { ...entry.projectile.visual },
    })),
    impactEvents: snapshot.impactEvents.map((event) => ({
      ...event,
      position: { ...event.position },
      visual: { ...event.visual },
    })),
  };
}

export function snapshotToGameState(snapshot: GameSnapshot): GameState {
  return {
    ...snapshotToGameViewState(snapshot),
    projectileDefinitions: snapshot.projectileDefinitions,
  };
}

export function createLocalGameAuthority(options: {
  mode: Exclude<GameMode, "online">;
  setup?: MatchSetup;
  content: GameContent;
  worldSize: WorldSize;
}): GameAuthority {
  return new SimulationGameAuthority(
    createLocalSimulationAuthority(options),
    (state, source) => resolveActiveLocalActor(state, source),
  );
}

export function createLocalGameManager(
  options: Parameters<typeof createLocalGameAuthority>[0],
): GameManager {
  return new CachedLocalGameManager(
    createLocalSimulationManager(options),
    options.content.projectiles,
  );
}

class SimulationGameAuthority implements GameAuthority {
  constructor(
    private readonly simulationAuthority: SimulationAuthority,
    private readonly resolveActor: (
      state: GameViewState,
      source: LocalActionSource,
    ) => number | null,
  ) {}

  submitAction(
    action: GameAction,
    source: LocalActionSource = "human",
  ): boolean {
    const state = this.getViewState();
    if (!state) return false;

    const playerId = this.resolveActor(state, source);
    if (playerId === null) return false;

    return this.simulationAuthority.submitPlayerAction(playerId, action);
  }

  update(dt: number): void {
    this.simulationAuthority.update(dt);
  }

  getViewState(): GameViewState | null {
    const snapshot = this.simulationAuthority.snapshot();
    return snapshot ? snapshotToGameViewState(snapshot) : null;
  }

  subscribe(listener: (state: GameViewState) => void): () => void;
  subscribe(listener: (state: GameViewState) => void): () => void {
    return this.simulationAuthority.subscribe((snapshot) => {
      listener(snapshotToGameViewState(snapshot));
    });
  }

  destroy(): void {
    this.simulationAuthority.destroy();
  }
}

class CachedLocalGameManager implements GameManager {
  private currentState: GameState;
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

function simulationStateToGameState(
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
  state: GameViewState | GameState,
  source: LocalActionSource,
): number | null {
  const activeTank = state.tanks.find(
    (entry) => entry.playerId === state.match.activePlayerId,
  );

  if (!activeTank) return null;
  if (activeTank.controllerKind !== source) return null;
  return activeTank.playerId;
}
