# Validate the full movement path

The server resolves a Movement Intent across every Surface Heightmap column between the tank's current position and proposed destination, deriving grounded positions and validating each terrain transition. Checking only the destination would allow a movement quantum to cross narrow impassable terrain whose endpoints happen to be valid.
