import type { GameSnapshot, RemotePlayerIntent } from "../types";

export type RemoteGameTransport = {
  sendIntent(intent: RemotePlayerIntent): void;
  onSnapshot(listener: (snapshot: GameSnapshot) => void): () => void;
  destroy?(): void;
};

export class RemoteSimulationAuthority {
  private currentSnapshot: GameSnapshot | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly transport: RemoteGameTransport) {
    this.unsubscribe = this.transport.onSnapshot((snapshot) => {
      this.currentSnapshot = snapshot;
    });
  }

  submitIntent(intent: RemotePlayerIntent): boolean {
    this.transport.sendIntent(intent);
    return true;
  }

  snapshot(): GameSnapshot | null {
    return this.currentSnapshot;
  }

  destroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.transport.destroy?.();
  }
}
