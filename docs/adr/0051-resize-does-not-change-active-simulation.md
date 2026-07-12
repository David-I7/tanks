# Resize does not change active simulation

After a game starts, browser resize updates canvas drawing size, renderer viewport, camera framing, and input coordinate mapping only. Local terrain size and gameplay world state are derived at game creation time and do not change during an active game because layout changes must not mutate gameplay.
