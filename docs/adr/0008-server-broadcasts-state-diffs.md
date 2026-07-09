# Server broadcasts state diffs

Online play broadcasts server-confirmed State Diffs rather than full-state updates during normal gameplay. Clients maintain local game state, apply authoritative diffs as they arrive, and reconcile any predicted local changes against those diffs, keeping bandwidth lower and making reconciliation an explicit client responsibility; full Resync State is reserved for targeted recovery.
