# TanStack Query for client async state management

Client async server state (User Session status, authentication mutations, and game asset loading) is managed via TanStack Query (`@tanstack/react-query`), while Zustand is retained strictly for synchronous client state (`useWebSocketStore`, `useThemeStore`, and in-memory `accessToken` / `user` identity). 

The `useUserStatusQuery` uses a 10-second `staleTime` and is invalidated manually during session transitions (joining lobbies or starting games). When an access token is refreshed in `TanksClient`, TanStack Query invalidates affected queries; when a user logs out or session restoration fails, `queryClient.clear()` purges all cached server state. Nested React decorator components like `RefreshUserStatusDecorator` are removed from route definitions in favor of direct query cache reads.
