# Games continue through disconnects

An active Game Session continues when a player disconnects because the Server Simulation Loop remains authoritative for online time. Reconnect and Resync State are recovery mechanisms, not pause mechanics; if the authoritative Turn Timer expires while a player is disconnected or inactive, that player takes no shot and the game advances according to normal turn rules.
