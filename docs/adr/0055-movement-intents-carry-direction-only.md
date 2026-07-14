# Movement intents carry direction only

A Movement Intent requests either leftward or rightward movement, and authoritative gameplay definitions supply the travel distance for each accepted intent. The client cannot request an arbitrary displacement; holding movement submits successive directional intents under the existing unresolved-intent limit, keeping movement rate and path validation under server control.
