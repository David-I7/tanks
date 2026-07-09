# Server gameplay implementation lives in Java

The authoritative online gameplay implementation lives in the Java server alongside Game Session, WebSocket, Redis, and persistence infrastructure. The client may keep its TypeScript simulation for local modes and rendering support, but online authority, validation, timing, and Gameplay Definitions are implemented server-side.
