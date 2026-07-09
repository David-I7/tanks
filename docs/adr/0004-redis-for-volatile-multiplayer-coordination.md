# Redis for volatile multiplayer coordination

Redis is the coordination store for volatile online multiplayer state such as quick-match ordering, socket ownership claims, lobby join claims, game creation claims, game start claims, connected player counts, and user-session reload signals. Durable account, authentication, and long-lived record data stay in Postgres, keeping fast WebSocket coordination separate from persistent product data.
