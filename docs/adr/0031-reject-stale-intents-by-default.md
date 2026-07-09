# Reject stale intents by default

If a Player Intent is based on stale Diff Sequence or Diff Server Tick context, the server rejects it by default instead of rebasing it onto current authoritative state. Rebasing movement or fire intents across terrain changes, turn changes, or damage is subtle, so the first version clears the matching Pending Prediction through an Intent Rejection Diff and lets the player act again from current state.
