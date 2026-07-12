import type { GameAction, GameState } from "../types";

export class AiIntentSource {
  private hasQueuedShotForTurn = false;
  private lastTurnNumber: number | null = null;
  private thinkingElapsed = 0;
  private plannedThinkingSeconds = 1.2;

  poll(gameState: GameState, dt: number): GameAction[] {
    const playerId = gameState.match.activePlayerId;

    if (gameState.match.phase !== "thinking") {
      return [];
    }

    if (this.lastTurnNumber !== gameState.match.turnNumber) {
      this.hasQueuedShotForTurn = false;
      this.lastTurnNumber = gameState.match.turnNumber;
      this.thinkingElapsed = 0;
      this.plannedThinkingSeconds = 1.15 + Math.random() * 1.35;
    }

    if (this.hasQueuedShotForTurn) return [];
    this.thinkingElapsed += dt;
    if (this.thinkingElapsed < this.plannedThinkingSeconds) return [];

    const self = gameState.tanks.find(
      (entry) => entry.playerId === playerId && entry.alive,
    );
    const target = gameState.tanks.find(
      (entry) => entry.playerId !== playerId && entry.alive,
    );
    if (!self || !target) return [];

    this.hasQueuedShotForTurn = true;
    const dx = target.position.x - self.position.x;
    const dy = target.position.y - self.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy - 120, dx);
    const power = Math.max(260, Math.min(distance * 0.72, 620));
    const projectileSlotId =
      self.loadout[
        Math.min(self.loadout.length - 1, gameState.match.turnNumber % 3)
      ]?.id ?? self.selectedProjectileSlotId;

    return [
      { type: "selectProjectileSlot", projectileSlotId },
      { type: "aim", angle, power },
      { type: "fire", angle, power, projectileSlotId },
    ];
  }
}
