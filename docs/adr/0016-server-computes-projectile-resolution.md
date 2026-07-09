# Server computes projectile resolution

Online firing is resolved by the server as a Projectile Resolution rather than by broadcasting projectile ticks. The server validates the fire intent and computes the projectile outcome, Projectile Trajectory, impact, terrain change, damage, and next turn state; clients animate the projectile locally from the server-provided trajectory and apply the resulting State Diffs.
