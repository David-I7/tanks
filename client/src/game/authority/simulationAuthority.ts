import type { GameContent } from "../content/mockGameContent";
import type { WorldSize } from "../world/worldSizing";
import {
  createDefaultMatchSetup,
  createInitialWorld,
} from "../world/createInitialWorld";
import { LocalSimulationAuthority } from "../simulation/LocalSimulationAuthority";
import type { GameAction, GameMode, GameSnapshot, MatchSetup } from "../types";

export type SimulationAuthority = {
  submitPlayerAction(playerId: number, action: GameAction): boolean;
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
  const setup = options.setup ?? createDefaultMatchSetup(options.mode ?? "localTwoPlayer");
  const { world, terrain, content } = createInitialWorld(
    setup,
    options.content,
    options.worldSize,
  );
  const localAuthority = new LocalSimulationAuthority(world, terrain, content);
  return {
    submitPlayerAction(playerId: number, action: GameAction): boolean {
      return localAuthority.submitPlayerAction(playerId, action);
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
