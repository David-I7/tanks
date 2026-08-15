# Tanks

Tanks is a multiplayer artillery game with a React/TypeScript client and a Java Spring server. The project supports local play on one machine and is being shaped around server-authoritative online play over WebSockets.

## Project Shape

- `client/` - React, Vite, TypeScript, canvas rendering, local simulation, local input, client-side prediction, and online state projection.
- `server/` - Spring Boot, HTTP auth, STOMP WebSockets, lobby/game session lifecycle, Redis coordination, Postgres persistence, and the planned authoritative online simulation.
