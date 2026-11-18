import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import HttpClient from "@/api/http/HttpClient";
import { useScreenStack } from "@/context/ScreenStack";
import type { HomeScreenStack } from "@/pages/home/HomePage";
import { usePlayerStore } from "@/store/usePlayerStore";
import type { LobbyActionResponseDto } from "../api/dto/LobbyActionResponseDto";
import CreateLobbyRequest from "../api/requests/CreateLobbyRequest";
import JoinLobbyRequest from "../api/requests/JoinLobbyRequest";
import { getLobbyId } from "../core/lobbyMachine";
import { useLobbySession } from "../core/useLobbySession";

function createOrJoinLobby(
  joinLobbyId: string | null,
  nickname: string,
  tankId: string,
): Promise<LobbyActionResponseDto> {
  const httpClient = new HttpClient();
  if (joinLobbyId) {
    return httpClient.send(
      new JoinLobbyRequest(joinLobbyId, { nickname, tankId }),
    );
  }
  return httpClient.send(new CreateLobbyRequest({ nickname, tankId }));
}

export default function usePrivateLobby(joinLobbyId: string | null) {
  const { popScreen } = useScreenStack<HomeScreenStack>();
  const [searchParams, setSearchParams] = useSearchParams();
  const player = usePlayerStore((s) => s.player);

  const initLobby = useCallback(() => {
    return createOrJoinLobby(
      joinLobbyId,
      player.nickname.trim(),
      player.tankId,
    );
  }, [joinLobbyId, player.nickname, player.tankId]);

  const handleExit = useCallback(() => {
    if (searchParams.has("lobbyId")) {
      const next = new URLSearchParams(searchParams);
      next.delete("lobbyId");
      setSearchParams(next, { replace: true });
    }
    popScreen();
  }, [searchParams, setSearchParams, popScreen]);

  const session = useLobbySession({
    mode: "private",
    initialLobbyId: joinLobbyId,
    initLobby,
    onExit: handleExit,
  });

  const { state } = session;
  const lobbyId = getLobbyId(state);
  const isHost =
    state.status !== "DISCONNECTED" && state.status !== "CONNECTING_TO_LOBBY"
      ? state.isHost
      : false;

  return {
    ...session,
    lobbyId,
    isHost,
    username: player.nickname,
    shareLink:
      isHost && lobbyId ? `${window.location.origin}?lobbyId=${lobbyId}` : null,
    canStartGame: state.status === "READY_TO_START" && state.isHost,
  };
}
