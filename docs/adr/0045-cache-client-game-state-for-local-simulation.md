# Cache client game state for local simulation

Local client simulation will publish cached read-only `SimulationState` and `GameState` objects after simulation changes instead of deep-copying state on every read. The simulation manager remains the only owner of mutable world state; renderers, input, UI, and game managers read the latest published state reference and must not mutate it.
