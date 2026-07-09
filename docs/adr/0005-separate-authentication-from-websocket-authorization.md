# Separate authentication from WebSocket authorization

HTTP authentication establishes who the user is through access tokens, refresh-token cookies, password login, registration, and OAuth2 flows. WebSocket authorization is a separate layer that decides whether the authenticated User Session may create or join lobbies, create games, subscribe to lobby or game topics, and send messages based on server-owned lifecycle state.
