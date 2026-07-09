# Server owns online gameplay definitions

For online play, the server owns authoritative Gameplay Definitions such as tank stats, projectile behavior, damage behavior, terrain effects, and validation bounds. The client may keep local definitions for local modes, but online clients receive only the identifiers and render-safe values needed to display the server-authoritative result.
