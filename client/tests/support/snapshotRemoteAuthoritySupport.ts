import { createInitialWorld } from "../../src/game/world/createInitialWorld";
import { LocalSimulationAuthority } from "../../src/game/simulation/LocalSimulationAuthority";
import type { GameContent } from "../../src/game/content/mockGameContent";
import type {
  GameAction,
  GameSnapshot,
  MatchSetup,
  RemoteGameAction,
} from "../../src/game/types";

export type SnapshotRemoteTransport = {
  sendIntent(action: RemoteGameAction): void;
  onSnapshot(listener: (snapshot: GameSnapshot) => void): () => void;
  destroy?(): void;
};

export type SnapshotSimulationAuthority = {
  submitPlayerAction(playerId: number, action: GameAction): boolean;
  update(dt: number): void;
  snapshot(): GameSnapshot | null;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
  destroy(): void;
};

export class SnapshotRemoteSimulationAuthority
  implements SnapshotSimulationAuthority
{
  private currentSnapshot: GameSnapshot | null = null;
  private readonly listeners = new Set<(snapshot: GameSnapshot) => void>();
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly transport: SnapshotRemoteTransport) {
    this.unsubscribe = this.transport.onSnapshot((snapshot) => {
      this.currentSnapshot = snapshot;
      for (const listener of this.listeners) {
        listener(snapshot);
      }
    });
  }

  submitPlayerAction(playerId: number, action: GameAction): boolean {
    this.transport.sendIntent({ playerId, intent: action });
    return true;
  }

  update(_dt: number): void {}

  snapshot(): GameSnapshot | null {
    return this.currentSnapshot;
  }

  subscribe(listener: (snapshot: GameSnapshot) => void): () => void {
    this.listeners.add(listener);
    if (this.currentSnapshot) listener(this.currentSnapshot);
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

export type MockSnapshotRemoteTransportOptions = {
  setup: MatchSetup;
  content: GameContent;
  width: number;
  height: number;
  latencyMs?: number;
};

export type MockSnapshotRemoteTransport = SnapshotRemoteTransport & {
  update(dt: number): void;
};

export function createMockSnapshotRemoteTransport(
  options: MockSnapshotRemoteTransportOptions,
): MockSnapshotRemoteTransport {
  const { world, terrain, content } = createInitialWorld(
    options.setup,
    options.content,
    { width: options.width, height: options.height },
  );
  const authority = new LocalSimulationAuthority(world, terrain, content);
  const listeners = new Set<(snapshot: GameSnapshot) => void>();
  const latencyMs = options.latencyMs ?? 45;
  const timeouts = new Set<ReturnType<typeof setTimeout>>();

  const emit = () => {
    const snapshot = authority.snapshot();
    for (const listener of listeners) {
      listener(snapshot);
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
        authority.submitPlayerAction(remoteIntent.playerId, remoteIntent.intent);
      });
    },
    onSnapshot(listener: (snapshot: GameSnapshot) => void): () => void {
      listeners.add(listener);
      schedule(() => {});
      return () => {
        listeners.delete(listener);
      };
    },
    update(dt: number): void {
      authority.update(dt);
      emit();
    },
    destroy(): void {
      for (const timeout of timeouts) clearTimeout(timeout);
      timeouts.clear();
      listeners.clear();
    },
  };
}

export function createSnapshotRemoteSimulationAuthority(
  transport: SnapshotRemoteTransport,
): SnapshotSimulationAuthority {
  return new SnapshotRemoteSimulationAuthority(transport);
}
