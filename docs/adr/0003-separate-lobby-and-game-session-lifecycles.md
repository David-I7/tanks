# Separate lobby and game session lifecycles

Online play uses a Lobby for pre-game player pairing and a Game Session for the game lifecycle after that lobby is ready. Keeping these stages separate lets the server authorize lobby actions, game creation, navigation, reconnect behavior, and turn ownership against explicit lifecycle state instead of overloading a single room or match concept.
