# Game engine starts with initial game state

Game managers must have an initial game state before the game engine is created or started. Local managers can create this synchronously; online pages wait for the server initial state before starting the engine, which keeps the engine state API non-null during the canvas loop.
