import ScreenStackProvider, { useScreenStack } from "../../context/ScreenStack";
import AuthenticatedRoute from "../../components/auth/AuthenticatedRoute";
import PrivateLobbyRoom from "../lobby/PrivateLobbyRoom";
import QuickMatchLobbyRoom from "../lobby/QuickMatchLobbyRoom";
import OnlineMenu from "./OnlineMenu";
import OfflineMenu from "./OfflineMenu";
import RootScreen from "./RootScreen";

export type HomeScreenStack =
  | "onlineMenu"
  | "root"
  | "offlineMenu"
  | "privateLobby"
  | "quickMatchLobby";

export default function HomePage() {
  const screens = {
    root: <RootScreen />,
    onlineMenu: (
      <AuthenticatedRoute>
        <OnlineMenu />
      </AuthenticatedRoute>
    ),
    offlineMenu: <OfflineMenu />,
    privateLobby: (
      <PrivateLobbyRoom />
    ),
    quickMatchLobby: (
      <QuickMatchLobbyRoom />
    ),
  };
  return (
    <ScreenStackProvider screens={screens}>
      <Layout />
    </ScreenStackProvider>
  );
}

function Layout() {
  const { screen } = useScreenStack();
  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen flex items-center justify-center relative z-10">
      {screen}
    </div>
  );
}





