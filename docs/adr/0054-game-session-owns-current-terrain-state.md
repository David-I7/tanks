# Game session owns current terrain state

Each active Game Session owns the full current Surface Heightmap alongside its tank state. Movement, projectile collision, and state snapshots read that same terrain state, while Terrain Patches are derived incremental notifications rather than the recovery source; this avoids replay-dependent correctness and guarantees that Initial State and Resync State describe the terrain actually used by the server simulation.
