# Sequence state diffs per game session

Every State Diff in online play carries a monotonically increasing Diff Sequence within its Game Session. Clients apply diffs in order and treat a missing or out-of-order sequence as a synchronization fault that requires resync or recovery rather than guessing how to repair local state.
