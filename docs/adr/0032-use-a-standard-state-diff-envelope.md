# Use a standard state diff envelope

Every State Diff uses a standard Diff Envelope containing `gameSessionId`, `sequence`, `serverTick`, `type`, and `payload`, with `intentId` included when the diff corresponds to a Player Intent. Keeping metadata consistent across movement, firing, terrain, turn, rejection, and game-over diffs makes ordering, reconciliation, resync, and debugging uniform.
