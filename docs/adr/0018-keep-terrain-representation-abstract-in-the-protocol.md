# Keep terrain representation abstract in the protocol

Terrain messages use explicit patch kinds instead of assuming one storage representation. The current protocol can carry heightmap-style patches, but the same gameplay model should allow mask-style patches later without changing projectile definitions, terrain effects, or the client/server synchronization contract.
