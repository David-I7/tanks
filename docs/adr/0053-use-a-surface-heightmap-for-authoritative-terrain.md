# Use a surface heightmap for authoritative terrain

Online gameplay represents authoritative terrain as one surface height per horizontal world coordinate. This makes grounding, slope validation, projectile collision, terrain patches, and resync use one deterministic model shared with local movement; in exchange, caves and overhangs are excluded, and drill effects must deform the exposed surface. This supersedes ADR-0018's representation-abstract protocol because retaining mask support would leave core movement and collision semantics unresolved.
