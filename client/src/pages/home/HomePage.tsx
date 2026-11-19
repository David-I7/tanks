import ScreenStackProvider, { useScreenStack } from "../../context/ScreenStack";
import PrivateLobbyRoom from "../../features/lobby/private/PrivateLobbyRoom";
import QuickMatchLobbyRoom from "../../features/lobby/quickmatch/QuickMatchLobbyRoom";
import OnlineMenu from "./OnlineMenu";
import OfflineMenu from "./OfflineMenu";
import RootScreen from "./RootScreen";
import OnlineGameScreen from "../game/GamePage";
import LocalGameScreen from "../game/LocalGamePage";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import useOnInitialMount from "@/hooks/useOnInitialMount";

export type HomeScreenStack =
  | "root"
  | "onlineMenu"
  | "offlineMenu"
  | "privateLobby"
  | "quickMatchLobby"
  | "onlineGame"
  | "offlineGame";

export default function HomePage() {
  const screens = {
    root: <RootScreen />,
    onlineMenu: <OnlineMenu />,
    offlineMenu: <OfflineMenu />,
    privateLobby: <PrivateLobbyRoom />,
    quickMatchLobby: <QuickMatchLobbyRoom />,
    onlineGame: <OnlineGameScreen />,
    offlineGame: <LocalGameScreen />,
  };
  return (
    <ScreenStackProvider screens={screens}>
      <Layout />
    </ScreenStackProvider>
  );
}

function Layout() {
  const { screen, pushScreen } = useScreenStack<HomeScreenStack>();
  const [searchParams] = useSearchParams();

  useOnInitialMount(() => {
    const lobbyIdParam = searchParams.get("lobbyId");
    if (lobbyIdParam && uuidSchema.safeParse(lobbyIdParam).success) {
      pushScreen("privateLobby", { lobbyId: lobbyIdParam });
    }
  });

  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen flex items-center justify-center relative z-10">
      {screen}
    </div>
  );
}
