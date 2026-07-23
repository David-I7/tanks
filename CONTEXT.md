# Tanks Game

The Tanks Game context describes the shared product language for online and local artillery combat. It names concepts that must remain consistent across the client, server, and documentation.

## Language

**User Session**:
An authenticated player's online presence in the product, including whether they are available, waiting in a lobby, or participating in a game.
_Avoid_: Route state, screen state, client session

**Session Resume**:
Restoring a reconnecting authenticated user to the lobby or game recorded by the server-owned user session.
_Avoid_: Route restore, client cache restore

**Topic Presence**:
Evidence that a user session is connected to the lobby or game topic required for online actions.
_Avoid_: Subscription ID, socket detail

**Active Socket**:
The single WebSocket connection currently allowed to act for an authenticated user session.
_Avoid_: Browser tab, device session

**Lobby**:
A server-owned pre-game pairing space where one or two players wait until an online game can be created.
_Avoid_: Room, match, game

**Lobby Host**:
The player in a lobby who can start the game when the lobby is ready.
_Avoid_: Owner, creator, admin

**Game Session**:
A server-owned online game lifecycle created from a ready lobby, including participating players, connection count, and session status.
_Avoid_: Lobby, room, match

**Turn Timer**:
The authoritative time limit for the active player's turn in an online game.
_Avoid_: Disconnect timer, client timer

**Game Result**:
A durable record of a completed online game, including participants, outcome, winner when applicable, and start/end times.
_Avoid_: Game session, match state, live game

**Chat Message**:
A user-authored communication event sent within an authorized lobby or game context.
_Avoid_: State diff, gameplay event

**Quick Match**:
An online pairing mode that automatically places a player into an available lobby or creates one when no suitable lobby is waiting.
_Avoid_: Matchmaking queue, random room

**Private Invite**:
A private lobby join path based on the lobby identifier shared by the host.
_Avoid_: Join token, invite code

