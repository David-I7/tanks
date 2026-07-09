Status: done

# Define the online gameplay protocol contracts

## Parent

.scratch/online-server-authoritative-gameplay/PRD.md

## What to build

Establish the shared online gameplay message contracts so server and client agents can implement Player Intents, Diff Envelopes, State Diffs, Initial State, Resync State, Movement Segments, Projectile Resolutions, Terrain Patches, and Intent Rejection Diffs against one vocabulary.

## Acceptance criteria

- [x] Player Intent messages include Intent ID, last confirmed Diff Sequence, last confirmed Diff Server Tick, intent type, and intent payload.
- [x] State Diffs use a standard Diff Envelope with game session identity, Diff Sequence, Diff Server Tick, type, and payload.
- [x] Contracts cover Initial State, Resync State, Movement Segment, Projectile Resolution, Terrain Patch, Intent Rejection Diff, turn transition, and terminal game diff shapes.
- [x] Contract tests or schema examples prove the server and client agree on the message shapes.

## Blocked by

- None - can start immediately.
