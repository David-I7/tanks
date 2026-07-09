# Synchronize terrain as patches

Normal online play synchronizes destructible terrain through Terrain Patches in the State Diff stream, usually produced by Projectile Resolutions. Full terrain state is reserved for Resync State, keeping ordinary gameplay updates incremental while preserving a recovery path.
