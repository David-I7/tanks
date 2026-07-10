import type { GameAction, GameSnapshot, RemoteGameAction } from "../types";

export type RemoteGameTransport = {
  sendIntent(action: RemoteGameAction): void;
  onSnapshot(listener: (snapshot: GameSnapshot) => void): () => void;
  destroy?(): void;
};

export class RemoteSimulationAuthority {
  private currentSnapshot: GameSnapshot | null = null;
  private readonly listeners = new Set<(snapshot: GameSnapshot) => void>();
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly transport: RemoteGameTransport) {
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
