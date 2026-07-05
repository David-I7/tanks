import type { GameSnapshot, PlayerIntent } from "../types";

export type RemoteGameTransport = {
  sendIntent(intent: PlayerIntent): void;
  onSnapshot(listener: (snapshot: GameSnapshot) => void): () => void;
};

export class RemoteSimulationAuthority {
  private currentSnapshot: GameSnapshot | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly transport: RemoteGameTransport) {
    this.unsubscribe = this.transport.onSnapshot((snapshot) => {
      this.currentSnapshot = snapshot;
    });
  }

  submitIntent(intent: PlayerIntent): boolean {
    this.transport.sendIntent(intent);
    return true;
  }

  snapshot(): GameSnapshot | null {
    return this.currentSnapshot;
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
