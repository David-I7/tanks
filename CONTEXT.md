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
A server-owned online game lifecycle created from a ready lobby, including the participating players, connection count, game state, and turn ownership.
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

**Player Intent**:
A requested player action before it has been accepted by the simulation authority.
_Avoid_: Command, input event

**Aim State**:
Local pre-fire aiming information such as angle and power that becomes authoritative only when included in a fire intent.
_Avoid_: Aim diff, aim command

**Intent ID**:
A client-generated identifier for a submitted player intent that lets server responses confirm or reject the matching pending prediction.
_Avoid_: Request timestamp, action index

**Simulation Authority**:
The part of the system that decides the official game state from accepted player intents.
_Avoid_: Renderer, controller

**Server Simulation Loop**:
The server-owned online gameplay loop that advances authoritative time, applies accepted intents, expires turn timers, and emits sequenced state diffs.
_Avoid_: Client loop, render loop

**Server Tick**:
One fixed 30 Hz step of the server simulation loop for an active online game session.
_Avoid_: Render frame, animation frame

**Client-Side Prediction**:
A client rendering technique that temporarily shows the likely result of local player intents before the server-confirmed state arrives.
_Avoid_: Client authority, optimistic game state

**Confirmed State**:
The client's local projection after applying all accepted server state diffs.
_Avoid_: Server state, snapshot cache

**Pending Prediction**:
A local predicted change for a submitted player intent that has not yet been confirmed or rejected by the server.
_Avoid_: Optimistic update, client truth

**Unresolved Intent**:
A player intent that has been submitted but has not yet been accepted or rejected by the server.
_Avoid_: Queued command, buffered input

**Render State**:
The state the client draws after combining confirmed state, pending predictions, and in-progress interpolation.
_Avoid_: World state, server state

**Game View State**:
The client-side gameplay presentation state consumed by rendering, input targeting, and game UI across local and online modes.
_Avoid_: Local snapshot, online snapshot, ECS state, protocol DTO

**Game Action**:
A mode-neutral player action produced by gameplay input or UI before it is handled by a local or online game authority.
_Avoid_: Input event, player intent, command

**Game Authority**:
The client-side boundary that accepts game actions and exposes game view state for a specific mode while hiding whether the mode is locally simulated or server-authoritative online play.
_Avoid_: Renderer, React page, transport, simulation loop

**Local Player**:
The player identity controlled by the current client in a game session, supplied by the authority for the current mode.
_Avoid_: Username match, first player, browser user

**State Diff**:
A server-confirmed change to the official game state that clients apply to their local game state.
_Avoid_: Full snapshot, event replay log

**Diff Envelope**:
The shared metadata around every state diff, including game session identity, sequence, server tick, type, and payload.
_Avoid_: Message wrapper, STOMP frame

**Terrain Patch**:
A server-confirmed diff describing the portion of destructible terrain changed by gameplay.
_Avoid_: Terrain snapshot, terrain image

**Destructible Terrain**:
The gameplay terrain model that can be changed by projectile effects and synchronized through terrain patch kinds.
_Avoid_: Heightmap, mask, background

**Local Two-Player**:
A local game mode where two human players share one client machine.
_Avoid_: Online match, hotseat match

**Player vs AI**:
A local game mode where one human player plays against an AI-controlled opponent on the client machine.
_Avoid_: Single-player, bot match

**Intent Rejection Diff**:
A sequenced state diff that rejects a player intent and tells the originating client to remove or correct the matching pending prediction.
_Avoid_: Error toast, validation reply

**Diff Sequence**:
A monotonically increasing number assigned to state diffs within a game session so clients can apply them in order and detect gaps.
_Avoid_: Timestamp, version string

**Diff Server Tick**:
The server tick on which a state diff was produced, used by clients to reconcile predictions against simulation time.
_Avoid_: Diff order, wall-clock timestamp

**Resync State**:
A complete server-confirmed game state returned to one client as recovery after it cannot safely apply state diffs.
_Avoid_: Broadcast snapshot, normal update

**Initial State**:
The complete authoritative game state sent when an online game begins or when a client first joins a game session.
_Avoid_: First diff, lobby payload

**Movement Segment**:
A server-accepted movement action with a confirmed start state, end state, and duration that the client renders over local monotonic time.
_Avoid_: Position stream, movement tick

**Projectile Resolution**:
A server-computed fire result that contains the projectile path outcome, impact, terrain change, damage, and turn transition needed for clients to animate and apply diffs.
_Avoid_: Projectile tick, client projectile simulation

**Projectile Trajectory**:
Server-provided projectile path data used by clients to animate a projectile resolution.
_Avoid_: Client recomputation, local ballistics

**Gameplay Definition**:
Authoritative rules data for online play, such as tank stats, projectile behavior, damage behavior, and terrain effects.
_Avoid_: Asset, skin, client config

**Gameplay Definition Version**:
A stable version identifier for the authoritative gameplay definitions used by an online game session.
_Avoid_: Build number, asset version

**Private Invite**:
A private lobby join path based on the lobby identifier shared by the host.
_Avoid_: Join token, invite code

**Render Asset ID**:
A stable identifier from server-owned gameplay data that the client maps to local images, animations, styles, or sounds.
_Avoid_: Asset path, CSS class, bundled filename
