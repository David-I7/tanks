# Game state is readonly at client boundaries

Game state exposed by game managers will be typed as readonly for renderers, input targeting, and UI subscribers. Runtime mutation remains owned by simulation managers or online diff projection code; immutable typing is used to prevent accidental mutation without forcing expensive deep freezing in the animation path.
