import { useCallback } from "react";
import HttpClient from "@/api/http/HttpClient";
import { useScreenStack } from "@/context/ScreenStack";
import { useAssetQuery } from "@/hooks/useAssetQuery";
import type { HomeScreenStack } from "@/pages/home/HomePage";
import { usePlayerStore } from "@/store/usePlayerStore";
import QuickMatchRequest from "../api/requests/QuickMatchRequest";
import { useLobbySession } from "../core/useLobbySession";

export default function useQuickMatchLobby() {
  const { popScreen } = useScreenStack<HomeScreenStack>();
  const player = usePlayerStore((s) => s.player);
  const { data: tanks } = useAssetQuery();

  const effectiveTankId =
    player.tankId || (tanks && tanks[0] ? tanks[0].id : "heavy-armor");

  const initLobby = useCallback(() => {
    const httpClient = new HttpClient();
    const nickname = player.nickname.trim() || "Player";
    return httpClient.send(
      new QuickMatchRequest({ nickname, tankId: effectiveTankId }),
    );
  }, [player.nickname, effectiveTankId]);

  const session = useLobbySession({
    mode: "quickmatch",
    initLobby,
    onExit: popScreen,
  });

  const playerCount =
    session.state.status === "WAITING_FOR_PLAYERS"
      ? 1
      : session.state.status === "READY_TO_START" ||
          session.state.status === "CREATING_GAME" ||
          session.state.status === "IN_GAME"
        ? 2
        : 0;

  return {
    ...session,
    playerCount,
  };
}
