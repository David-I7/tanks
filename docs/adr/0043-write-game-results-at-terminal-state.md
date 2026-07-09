# Write game results at terminal state

The server writes a Game Result when the authoritative Game Session reaches a terminal state. Outcomes start with win and draw, with the winner recorded only when applicable; richer result reasons can be added later without changing the split between live session state and durable result history.
