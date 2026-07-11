import { createInitialWorld } from "../world/createInitialWorld";
import { LocalSimulationAuthority } from "../simulation/LocalSimulationAuthority";
import type { GameContent } from "../content/mockGameContent";
import type { GameSnapshot, MatchSetup, RemoteGameAction } from "../types";
import type { RemoteGameTransport } from "./RemoteSimulationAuthority";

export type MockRemoteTransportOptions = {
  setup: MatchSetup;
  content: GameContent;
  width: number;
  height: number;
  latencyMs?: number;
};

export type MockRemoteTransport = RemoteGameTransport & {
  update(dt: number): void;
};

export function createMockRemoteTransport(
  options: MockRemoteTransportOptions,
): MockRemoteTransport {
  const { world, terrain, content } = createInitialWorld(
    options.setup,
    options.content,
    options.width,
    options.height,
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
