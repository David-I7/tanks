# State diffs carry sequence and server tick

Every State Diff carries both a Diff Sequence and a Diff Server Tick. Clients use the sequence to apply diffs in order and detect missed messages, while using the server tick as simulation-time context for prediction reconciliation, interpolation, debugging, and resync alignment.
