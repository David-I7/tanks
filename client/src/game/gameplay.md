# Gameplay Architecture

This is a turn-based artillery tank game. The client sends Player Intents into a Simulation Authority, then renders official World State from that authority.

## Match Model

A match starts from a `MatchSetup`:

- `mode`: `twoPlayer`, `ai`, `online`, or `singlePlayer`
- players
- display names
- controller kind: `human`, `ai`, or `remote`
- selected tank definition

Each tank definition has a name, health, visual identity, and exactly five Projectile Slots. A Projectile Slot points to a shared Projectile Definition.

A Projectile Definition controls:

- projectile physics: radius, gravity scale, drag, muzzle velocity scale
- terrain effect: crater or drill
- damage effect: radial or focused
- impact animation identity
- visual identity

The tank owns slots. Projectile behavior comes from the slot's Projectile Definition, resolved by the Simulation Authority.

## Current Client Modules

`GameEngine`

- Browser-facing runtime.
- Owns renderer, canvas input, AI input, sizing, and the active Simulation Authority adapter.
- Exposes `submitIntent`, `getSnapshot`, and `subscribe`.
- Does not branch on local vs remote for authority lifecycle operations after construction.

`authority/simulationAuthority.ts`

- Defines the caller-facing `SimulationAuthority` interface.
- Creates local and remote adapters with consistent methods:
  - `submitIntent(playerId, intent)`
  - `update(dt)`
  - `snapshot()`
  - `subscribe(listener)`
  - `destroy()`

`LocalSimulationAuthority`

- The real Simulation Authority for local/offline play.
- Validates Player Intents.
- Updates World State.
- Applies movement, firing, projectile physics, terrain damage, tank damage, turn changes, and winner detection.
- Publishes ordered World State messages for local subscribers.

`RemoteSimulationAuthority`

- Adapter over `RemoteGameTransport`.
- Sends Player Intents through the remote transport shape.
- Receives server-authoritative-shaped snapshots.
- Satisfies the same `SimulationAuthority` interface used by `GameEngine`.

`createMockRemoteTransport`

- Test/development transport for the online path.
- Wraps a local `LocalSimulationAuthority`, but exposes the remote transport shape.
- Keeps mocked online play exercising remote-style snapshot delivery.

## World Folder

World-related code lives in `src/game/world`.

`World.ts`

- ECS-style simulation storage.
- Stores positions, velocities, tanks, projectiles, lifetimes, impact events, and match state.

`createInitialWorld.ts`

- Validates Match Setup and Game Content.
- Creates the initial `World` and `TerrainModel`.
- Uses explicit world size, not canvas backing pixels.

`worldSizing.ts`

- Separates viewport size, official world size, and canvas backing size.
- Device pixel ratio only affects backing pixels for render quality.
- World dimensions remain stable across device pixel ratios.

`worldStatePublisher.ts`

- Publishes ordered World State messages.
- Full snapshot messages include static content for startup, joins, debug flows, and tests.
- Steady-state frame messages reference `contentVersion` instead of copying Projectile Definitions every frame.
- Terrain patch messages carry terrain changes without exposing mutable terrain internals.

## Terrain

`TerrainModel` is currently a heightmap backend.

It supports:

- surface lookup
- slope lookup
- circle collision
- terrain effects
- full terrain snapshots
- heightmap-range terrain patches

Terrain effects return patch information after mutation. Consumers can observe terrain changes through patches while full terrain serialization remains available for full World State snapshots.

The current backend is a heightmap, but consumers should treat terrain through snapshots and patches so a future Destructible Terrain Mask backend remains possible.

## Input

`CanvasInputSource` owns browser input collection, but Player Intent creation is handled by registered intent producers.

The input seam uses:

- `CanvasInteractionState`: pressed keys, pointer state, pending pointer down, pending slot number
- `CanvasInteractionContext`: World State, camera X, viewport, cached canvas rect

Intent producers currently cover:

- movement
- keyboard Projectile Slot selection
- pointer Projectile Slot selection
- aiming
- firing

`CanvasInputSource.poll()` does not call `getBoundingClientRect()`. Canvas layout is measured by `GameEngine.resize()` and cached in `CanvasInputSource`. Resize handling is the only place the DOM rect should be refreshed.

## Rendering

`CanvasGameRenderer` draws World State and should not decide game rules.

Its external interface stays small:

- `render(snapshot)`
- `getCameraX()`
- `setViewport(viewport)`
- `getViewport()`

Internally it uses explicit render passes with shared render context:

- terrain
- trajectory preview
- impact events
- projectiles
- tanks
- HUD

The renderer uses viewport dimensions for camera clamping, HUD layout, and Projectile Selector geometry. Canvas backing dimensions are only used to scale drawing for render quality.

Projectile Selector rendering and hit testing both use the same viewport-based layout rules.

## Runtime Loop

Every frame:

1. `GameEngine` asks the active `SimulationAuthority` for the latest snapshot.
2. If the active controller is human, cached canvas input state produces Player Intents.
3. If the active controller is AI, AI input produces Player Intents.
4. Intents are submitted to the active Simulation Authority.
5. The authority validates intents.
6. The authority advances the simulation.
7. The renderer draws the latest official snapshot.
8. Subscribers receive official World State through the authority/publisher path.

## Player Intents

```ts
type PlayerIntent =
  | { type: "move"; direction: -1 | 0 | 1 }
  | { type: "aim"; angle: number; power: number }
  | { type: "selectProjectileSlot"; projectileSlotId: string }
  | {
      type: "fire";
      angle: number;
      power: number;
      projectileSlotId: string;
    };
```

Important rule: firing includes the Projectile Slot. The Simulation Authority resolves that slot through the active tank's loadout. The client cannot decide projectile behavior by itself in online mode.

## Turn Lifecycle

The match phase moves roughly like this:

```text
aiming / thinking
-> ballistics
-> impact
-> transition
-> next aiming / thinking
```

- `aiming`: human player can move, aim, select projectile, and fire.
- `thinking`: AI equivalent.
- `ballistics`: projectile is flying.
- `impact`: impact event exists briefly for rendering.
- `transition`: short delay before the next turn.
- `gameOver`: one tank remains.

## Server Responsibilities

For real online play, the server should replace `createMockRemoteTransport` as the source of truth.

The server must own:

- Match Setup validation
- Game Content or a versioned content contract
- World creation
- Player Intent validation
- simulation ticks
- terrain mutation
- damage application
- turn transitions
- winner detection
- World State message broadcast

The client should only submit Player Intents and render official World State.

## Remote Transport Contract

Current mock transport shape:

```ts
type RemoteGameTransport = {
  sendIntent(intent: RemotePlayerIntent): void;
  onSnapshot(listener: (snapshot: GameSnapshot) => void): () => void;
  destroy?(): void;
};
```

For real STOMP, that maps to:

- publish intent to something like `/app/game/{id}/intent`
- subscribe to something like `/topic/game/{id}/snapshot`

The remote path should eventually publish the same conceptual World State messages as local play, even if the transport initially sends full snapshots.

## Minimum Server DTOs

```ts
type CreateMatchRequest = {
  mode: "online";
  players: Array<{
    id: number;
    displayName: string;
    tankDefinitionId: string;
  }>;
};

type GameIntentRequest = {
  playerId: number;
  intent: PlayerIntent;
};

type GameSnapshotMessage = {
  type: "GAME_SNAPSHOT";
  payload: GameSnapshot;
};

type GameErrorMessage = {
  type: "GAME_ERROR";
  payload: {
    code: string;
    message: string;
  };
};
```

## Implementation Direction

1. Put tank/projectile content on the server or define a shared versioned catalog.
2. Implement server-side Match Setup validation.
3. Implement server-side world creation with explicit world sizing.
4. Port or share simulation logic:
   - world state
   - terrain model
   - projectile physics
   - damage and terrain effects
   - turn lifecycle
5. Add STOMP intent endpoint.
6. Add STOMP World State broadcast.
7. Update `GamePage` to create a real `RemoteGameTransport`.
8. Keep local/offline using `LocalSimulationAuthority`.

The key rule: in online mode, the client renders snapshots/messages and submits intents. The server decides official state.
