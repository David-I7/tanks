# Organize server gameplay as a deep module

Server gameplay is organized into `content`, `world`, `simulation`, and `validation` packages, with `GameSimulation` as the small external interface. Game Content and mutable world models are explicit inputs, while movement, ballistics, terrain mutation, settlement, and validation remain behind that interface; client-only concerns such as rendering and input are excluded, and no redundant authority package is introduced because server simulation is already authoritative.
