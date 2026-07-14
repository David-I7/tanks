# Resolve unsupported tanks with vertical settlement

After movement or terrain deformation leaves a tank unsupported, the server resolves Tank Settlement vertically to the first supporting Surface Heightmap position and sends an animatable segment. Tanks do not run continuous rigid-body gravity or slide sideways automatically; this removes authoritative floating states while keeping terrain outcomes deterministic and compatible with the turn-based simulation.
