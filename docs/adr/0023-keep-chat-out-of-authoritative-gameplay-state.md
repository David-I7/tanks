# Keep chat out of authoritative gameplay state

Chat uses the same WebSocket transport and authorization boundaries as lobbies and games, but it is communication only. Chat Messages are not part of the gameplay State Diff stream, do not affect Confirmed State, and should not participate in prediction or reconciliation.
