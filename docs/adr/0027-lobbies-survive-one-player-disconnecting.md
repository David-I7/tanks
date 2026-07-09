# Lobbies survive one player disconnecting

A Lobby survives when one of two players disconnects. If the Lobby Host leaves, the remaining player becomes the host; the lobby returns to waiting for an opponent, preserving a stable pre-game space for private links, quick-match cleanup, and resume behavior. Empty lobbies are deleted immediately because they have no owner or audience and would otherwise leave stale private links or quick-match entries.
