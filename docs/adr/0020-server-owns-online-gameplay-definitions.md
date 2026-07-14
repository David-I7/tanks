# Server owns online game content

---
status: superseded by ADR-0065
---

For online play, the server owns authoritative Game Content such as tank stats, projectile behavior, damage behavior, terrain effects, and validation bounds. The client may keep local content for local modes, but online clients receive only the identifiers and render-safe values needed to display the server-authoritative result.
