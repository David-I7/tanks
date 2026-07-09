# Local receive-time movement interpolation

Online tank movement will be represented as server-accepted Movement Segments that contain confirmed start state, end state, and duration. The local player client may predict immediately after sending a movement intent, then reconcile when the server-accepted segment arrives; all clients start confirmed interpolation when they receive the segment and use local monotonic time for rendering. Different clients may see the animation begin at slightly different moments, while the server-owned final state remains authoritative.
