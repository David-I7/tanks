# Send authoritative game content for online play

The server remains the owner of online Game Content, but Initial State and Resync State responses carry the versioned content needed to construct the client's `GameContent` model. Clients may use it for rendering and prediction, while server outcomes remain authoritative; sending the rules avoids relying on a version identifier and bundled client assumptions to reproduce movement quantum, fuel cost, climb capability, geometry, and projectile previews. This supersedes ADR-0020's restriction to identifiers and render-safe values only.
