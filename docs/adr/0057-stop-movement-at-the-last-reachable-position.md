# Stop movement at the last reachable position

When only part of a Movement Path is traversable, the server accepts Partial Movement to the last reachable grounded position and charges only for the traversal actually completed. It rejects the Movement Intent only when no progress is possible, allowing tanks to approach obstacles without an artificial gap of up to one movement quantum.
