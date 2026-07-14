# Store a generation seed per game session

Each Game Session stores a server-generated Generation Seed used by an injected deterministic generator during initial terrain and spawn creation. The generated terrain and final spawn positions are then stored as authoritative session state, so runtime physics consumes resolved state rather than randomness while tests and diagnostics can reproduce initialization exactly.
