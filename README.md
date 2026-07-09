# Tanks

Tanks is a multiplayer artillery game with a React/TypeScript client and a Java Spring server. The project supports local play on one machine and is being shaped around server-authoritative online play over WebSockets.

## Project Shape

- `client/` - React, Vite, TypeScript, canvas rendering, local simulation, local input, client-side prediction, and online state projection.
- `server/` - Spring Boot, HTTP auth, STOMP WebSockets, lobby/game session lifecycle, Redis coordination, Postgres persistence, and the planned authoritative online simulation.
- `CONTEXT.md` - shared product and architecture vocabulary.
- `docs/adr/` - architectural decision records for client/server boundaries, online synchronization, prediction, lobbies, sessions, and persistence.

## Gameplay Model

The product has three intended play paths:

- Online play through server-owned lobbies and game sessions.
- Local Two-Player on one client machine.
- Player vs AI on one client machine.

Online gameplay is server authoritative. The server owns game time through a fixed 30 Hz simulation loop, validates player intents, advances turn timers, computes authoritative state, and broadcasts sequenced state diffs. The client renders at its own refresh rate and uses client-side prediction, interpolation, and reconciliation for smooth presentation.

Normal online updates are incremental state diffs, not full-state broadcasts. Clients request full resync state only for recovery, reconnect, or sequence gaps.

## Online Architecture

Key decisions:

- One authenticated user has one active WebSocket connection.
- User sessions, lobbies, game sessions, topic presence, and reconnect behavior are server-owned.
- Redis coordinates volatile multiplayer state such as quick match, socket claims, lobby joins, game creation, and live session state.
- Postgres stores durable account/auth data and completed game results.
- Private lobbies use the lobby ID as the initial invite mechanism.
- Quick Match pairs with the oldest valid waiting lobby.
- Chat is communication only and is not part of authoritative gameplay state.

See `docs/adr/` for the detailed decisions.

## Local Development

Start infrastructure from the server directory:

```powershell
cd server
docker compose up -d
```

Run the server:

```powershell
cd server
.\mvnw spring-boot:run
```

Run the client:

```powershell
cd client
npm install
npm run dev
```

Build the client:

```powershell
cd client
npm run build
```

Run client game tests:

```powershell
cd client
npm run test:game
```

Run server tests:

```powershell
cd server
.\mvnw test
```

## Documentation

- Start with `CONTEXT.md` for shared vocabulary.
- Read `docs/adr/0006-server-authoritative-looped-simulation.md`, `docs/adr/0008-server-broadcasts-state-diffs.md`, and `docs/adr/0009-client-projects-diffs-with-pending-predictions.md` for the online synchronization model.
- Read `docs/adr/0029-fixed-30hz-server-simulation-loop.md` and `docs/adr/0030-state-diffs-carry-sequence-and-server-tick.md` for server timing and reconciliation metadata.
