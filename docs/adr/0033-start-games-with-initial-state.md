# Start games with initial state

When an online Game Session starts or a client first joins it, the server sends Initial State rather than requiring the client to reconstruct the world from lobby events or the first gameplay diff. After Initial State, normal gameplay proceeds through sequenced State Diffs, and later recovery uses Resync State.
