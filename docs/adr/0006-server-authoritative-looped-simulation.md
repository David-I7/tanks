# Server-authoritative looped simulation

Online play uses a server-authoritative game model with client-side prediction and a Server Simulation Loop. The server owns authoritative time, validates and applies accepted Player Intents, advances turn timers, computes official state, and broadcasts sequenced State Diffs; clients may predict locally for responsiveness and reconcile against those diffs.
