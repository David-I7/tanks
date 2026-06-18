import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import ScreenStackProvider, { useScreenStack } from "../../context/ScreenStack";
import IconButton from "../../components/buttons/IconButton";
import { ArrowLeft } from "lucide-react";
import AuthenticatedRoute from "../../components/auth/AuthenticatedRoute";
import PrivateLobbyRoom from "../lobby/PrivateLobbyRoom";
import Logout from "../../components/auth/Logout";
import QuickMatchLobbyRoom from "../lobby/QuickMatchLobbyRoom";

type Screen =
  | "onlineMenu"
  | "root"
  | "offlineMenu"
  | "privateLobby"
  | "quickMatchLobby";

export default function HomePage() {
  const screens = {
    root: <RootState />,
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
  const { screen } = useScreenStack<Screen>();
  return (
    <div className="p-4 md:p-6 lg:p-8 min-h-screen flex items-center justify-center relative z-10">
      {screen}
    </div>
  );
}

function RootState() {
  const { pushScreen } = useScreenStack<Screen>();
  return (
    <div className="cyber-panel px-8 py-8 w-full max-w-sm flex flex-col gap-5 text-center">
      <H1 className="text-center py-2">Tanks!</H1>
      <Button onClick={() => pushScreen("onlineMenu")} color="primary">
        Online Mode
      </Button>
      <Button onClick={() => pushScreen("offlineMenu")} color="secondary">
        Offline Mode
      </Button>
      <Logout
        color="secondary"
        variant="outline"
        onSuccess={() => console.log("Logged out")}
        onFailure={console.error}
      />
    </div>
  );
}

function OnlineMenu() {
  const { popScreen, pushScreen } = useScreenStack<Screen>();

  return (
    <div className="cyber-panel px-8 py-8 w-full max-w-sm flex flex-col gap-5 text-center relative pt-14">
      <div className="absolute top-4 left-4">
        <IconButton onClick={() => popScreen()} icon={<ArrowLeft size={16} />} />
      </div>
      <H1 className="text-center mb-2">Online</H1>
      <Button color="primary" onClick={() => pushScreen("quickMatchLobby")}>
        Play Quick Match
      </Button>
      <Button color="secondary" onClick={() => pushScreen("privateLobby")}>
        Create Private Room
      </Button>
    </div>
  );
}

function OfflineMenu() {
  const { popScreen } = useScreenStack();
  return (
    <div className="cyber-panel px-8 py-8 w-full max-w-sm flex flex-col gap-5 text-center relative pt-14">
      <div className="absolute top-4 left-4">
        <IconButton onClick={() => popScreen()} icon={<ArrowLeft size={16} />} />
      </div>
      <H1 className="text-center mb-2">Offline</H1>
      <Button color="primary">Single Player</Button>
      <Button color="secondary">Two Players</Button>
    </div>
  );
}
