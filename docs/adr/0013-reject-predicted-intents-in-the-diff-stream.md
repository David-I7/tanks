# Reject predicted intents in the diff stream

Player Intent rejections that affect Pending Predictions are sent as sequenced State Diffs, not as separate unordered replies. This keeps prediction cleanup ordered with accepted game-state changes, while validation errors that do not affect predicted state may still use per-user error channels.
