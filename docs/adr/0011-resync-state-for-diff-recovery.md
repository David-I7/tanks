# Resync state for diff recovery

Normal online play broadcasts State Diffs, but a client that detects a missing or out-of-order Diff Sequence may request Resync State containing the whole authoritative game state. Resync State is a targeted recovery response to one client, not the regular broadcast model for gameplay updates. Applying Resync State clears that client's Pending Predictions, sets the expected next Diff Sequence, and resumes from authoritative state.
