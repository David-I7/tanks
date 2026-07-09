# Server-owned user session lifecycle

Online presence is owned by the server-side User Session lifecycle, not by React route state or local UI state. The client may navigate and render based on lobby or game events, but the server decides whether an authenticated player is available, waiting in a lobby, or participating in a game so authorization and reconnect behavior have one source of truth.
