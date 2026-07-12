import { createInitialWorld } from "../../src/game/world/createInitialWorld";
import { LocalSimulation } from "../../src/game/simulation/LocalSimulation";
import type { GameContent } from "../../src/game/content/mockGameContent";
import type {
  GameAction,
  MatchSetup,
  RemoteGameAction,
  SimulationState,
} from "../../src/game/types";

export type RemoteSimulationTransport = {
  sendIntent(action: RemoteGameAction): void;
  onSimulationState(listener: (state: SimulationState) => void): () => void;
  destroy?(): void;
};

export type RemoteSimulationManager = {
  submitPlayerAction(playerId: number, action: GameAction): boolean;
  update(dt: number): void;
  getState(): SimulationState | null;
  subscribe(listener: (state: SimulationState) => void): () => void;
  destroy(): void;
};

export class TestRemoteSimulationManager
  implements RemoteSimulationManager
{
  private currentState: SimulationState | null = null;
  private readonly listeners = new Set<(state: SimulationState) => void>();
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly transport: RemoteSimulationTransport) {
    this.unsubscribe = this.transport.onSimulationState((state) => {
      this.currentState = state;
      for (const listener of this.listeners) {
        listener(state);
      }
    });
  }

  submitPlayerAction(playerId: number, action: GameAction): boolean {
    this.transport.sendIntent({ playerId, intent: action });
    return true;
  }

  update(_dt: number): void {}

  getState(): SimulationState | null {
    return this.currentState;
  }

  subscribe(listener: (state: SimulationState) => void): () => void {
    this.listeners.add(listener);
    if (this.currentState) listener(this.currentState);
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listeners.clear();
    this.transport.destroy?.();
  }
}

export type MockRemoteSimulationTransportOptions = {
  setup: MatchSetup;
  content: GameContent;
  width: number;
  height: number;
  latencyMs?: number;
};

export type MockRemoteSimulationTransport = RemoteSimulationTransport & {
  update(dt: number): void;
};

export function createMockRemoteSimulationTransport(
  options: MockRemoteSimulationTransportOptions,
): MockRemoteSimulationTransport {
  const { world, terrain, content } = createInitialWorld(
    options.setup,
    options.content,
    { width: options.width, height: options.height },
  );
  const simulation = new LocalSimulation(world, terrain, content);
  const listeners = new Set<(state: SimulationState) => void>();
  const latencyMs = options.latencyMs ?? 45;
  const timeouts = new Set<ReturnType<typeof setTimeout>>();

  const emit = () => {
    const state = simulation.getState();
    for (const listener of listeners) {
      listener(state);
    }
  };

  const schedule = (work: () => void) => {
    const timeout = setTimeout(() => {
      timeouts.delete(timeout);
      work();
      emit();
    }, latencyMs);
    timeouts.add(timeout);
  };

  return {
    sendIntent(remoteIntent: RemoteGameAction): void {
      schedule(() => {
        simulation.submitPlayerAction(remoteIntent.playerId, remoteIntent.intent);
      });
    },
    onSimulationState(listener: (state: SimulationState) => void): () => void {
      listeners.add(listener);
      schedule(() => {});
      return () => {
        listeners.delete(listener);
      };
    },
    update(dt: number): void {
      simulation.update(dt);
      emit();
    },
    destroy(): void {
      for (const timeout of timeouts) clearTimeout(timeout);
      timeouts.clear();
      listeners.clear();
    },
  };
}

export function createRemoteSimulationManager(
  transport: RemoteSimulationTransport,
): RemoteSimulationManager {
  return new TestRemoteSimulationManager(transport);
}
