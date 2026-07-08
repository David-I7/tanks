import type { GameContent } from "../content/mockGameContent";
import type { WorldSize } from "../world/worldSizing";
import {
  createDefaultMatchSetup,
  createInitialWorld,
} from "../world/createInitialWorld";
import { LocalSimulationAuthority } from "../simulation/LocalSimulationAuthority";
import type { GameMode, GameSnapshot, MatchSetup, PlayerIntent } from "../types";
import {
  RemoteSimulationAuthority,
  type RemoteGameTransport,
} from "./RemoteSimulationAuthority";

export type SimulationAuthority = {
  submitIntent(playerId: number, intent: PlayerIntent): boolean;
  update(dt: number): void;
  snapshot(): GameSnapshot | null;
  subscribe(listener: (snapshot: GameSnapshot) => void): () => void;
  destroy(): void;
};

export function createLocalSimulationAuthority(options: {
  mode?: GameMode;
  setup?: MatchSetup;
  content: GameContent;
  worldSize: WorldSize;
}): SimulationAuthority {
  const setup = options.setup ?? createDefaultMatchSetup(options.mode ?? "twoPlayer");
  const { world, terrain, content } = createInitialWorld(
    setup,
    options.content,
    options.worldSize,
  );
  const localAuthority = new LocalSimulationAuthority(world, terrain, content);
  return {
    submitIntent(playerId: number, intent: PlayerIntent): boolean {
      return localAuthority.submitIntent(playerId, intent);
    },
    update(dt: number): void {
      localAuthority.update(dt);
    },
    snapshot(): GameSnapshot {
      return localAuthority.snapshot();
    },
    subscribe(listener: (snapshot: GameSnapshot) => void): () => void {
      const unsubscribe = localAuthority.subscribeMessages((message) => {
        if (message.type === "snapshot") listener(message.snapshot);
        if (message.type === "frame") {
          listener({
            ...message.state,
            projectileDefinitions: options.content.projectiles,
          });
        }
      });
      return unsubscribe;
    },
    destroy(): void {
      localAuthority.destroy();
    },
  };
}

export function createRemoteSimulationAuthority(
  transport: RemoteGameTransport,
): SimulationAuthority {
  return new RemoteSimulationAuthority(transport);
}
