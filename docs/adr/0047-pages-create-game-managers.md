# Pages create game managers

Game pages or dedicated factories will create the appropriate game manager and pass it to the game engine. The game engine owns the canvas loop, input polling, rendering, and resize plumbing, but it does not decide whether gameplay is local, AI, or online.
