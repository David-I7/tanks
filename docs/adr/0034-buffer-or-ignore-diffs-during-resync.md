# Buffer or ignore diffs during resync

During Resync State recovery, the client does not apply ordinary State Diffs directly to its old local state. It either buffers diffs newer than the resync response sequence or ignores them and relies on the resync response to establish the next expected Diff Sequence, preventing races between topic subscription, resync, and live gameplay updates.
