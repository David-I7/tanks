# Active games do not survive server or Redis restart

The first online architecture treats active Game Sessions as volatile. If the server or Redis loses live game state, affected clients fall back through Session Resume failure to the idle/home flow rather than attempting to reconstruct active games from durable records.
