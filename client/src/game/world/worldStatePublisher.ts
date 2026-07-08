import type { GameSnapshot, TerrainPatch } from "../types";

export type FrameWorldState = Omit<GameSnapshot, "projectileDefinitions"> & {
  contentVersion: string;
};

export type WorldStateMessage =
  | {
      type: "snapshot";
      sequence: number;
      snapshot: GameSnapshot;
    }
  | {
      type: "frame";
      sequence: number;
      state: FrameWorldState;
      terrainPatches: TerrainPatch[];
    }
  | {
      type: "terrainPatch";
      sequence: number;
      patch: TerrainPatch;
    };

export type WorldStatePublisher = {
  publishSnapshot(snapshot: GameSnapshot): WorldStateMessage;
  publishFrame(snapshot: GameSnapshot, terrainPatches?: TerrainPatch[]): WorldStateMessage;
  publishTerrainPatch(patch: TerrainPatch): WorldStateMessage;
  drain(messages: WorldStateMessage[]): WorldStateMessage[];
};

export function createWorldStatePublisher(
  contentVersion: string,
): WorldStatePublisher {
  let sequence = 0;
  const nextSequence = () => {
    sequence += 1;
    return sequence;
  };

  return {
    publishSnapshot(snapshot: GameSnapshot): WorldStateMessage {
      return {
        type: "snapshot",
        sequence: nextSequence(),
        snapshot,
      };
    },
    publishFrame(
      snapshot: GameSnapshot,
      terrainPatches: TerrainPatch[] = [],
    ): WorldStateMessage {
      const { projectileDefinitions: _projectileDefinitions, ...state } =
        snapshot;
      return {
        type: "frame",
        sequence: nextSequence(),
        state: {
          ...state,
          contentVersion,
        },
        terrainPatches,
      };
    },
    publishTerrainPatch(patch: TerrainPatch): WorldStateMessage {
      return {
        type: "terrainPatch",
        sequence: nextSequence(),
        patch,
      };
    },
    drain(messages: WorldStateMessage[]): WorldStateMessage[] {
      return messages;
    },
  };
}
