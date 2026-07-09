# Fixed 30 Hz server simulation loop

Online Game Sessions run on a fixed 30 Hz Server Simulation Loop. The server owns gameplay time, validates intents, advances timers, updates authoritative gameplay state, and emits sequenced State Diffs when meaningful state changes occur; clients render at their own refresh rate and use prediction, interpolation, and reconciliation for smooth presentation.
