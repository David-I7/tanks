import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import ScreenStackProvider, { useScreenStack } from "../../context/ScreenStack";
import IconButton from "../../components/buttons/IconButton";
import { ArrowLeft } from "lucide-react";
import Loader from "../../components/misc/Loader";
import { useEffect } from "react";
import AuthenticatedRoute from "../../components/auth/AuthenticatedRoute";
import PrivateLobbyRoom from "../lobby/PrivateLobbyRoom";
import Logout from "../../components/auth/Logout";
import { WebSocketProvider } from "../../context/WebSocketContext";

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
      <WebSocketProvider>
        <PrivateLobbyRoom />
      </WebSocketProvider>
    ),
    quickMatchLobby: (
      <WebSocketProvider>
        <QuickMatchLobbyRoom />
      </WebSocketProvider>
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
    <div className="p-4 md:p-6 lg:p-8 h-screen min-h-screen grid place-items-center">
      <div className="bg-surface-high">{screen}</div>
    </div>
  );
}

function RootState() {
  const { pushScreen } = useScreenStack<Screen>();
  return (
    <>
      <H1 className="text-center py-4">Welcome to Tanks!</H1>
      <Button onClick={() => pushScreen("onlineMenu")} color="primary">
        Online
      </Button>
      <Button onClick={() => pushScreen("offlineMenu")} color="secondary">
        Offline
      </Button>
      <Logout
        color="secondary"
        onSuccess={() => console.log("Logged out")}
        onFailure={console.error}
      />
    </>
  );
}

function OnlineMenu() {
  const { popScreen, pushScreen } = useScreenStack<Screen>();

  return (
    <>
      <H1 className="text-center py-4">Welcome to Tanks!</H1>
      <IconButton onClick={() => popScreen()} icon={<ArrowLeft />} />
      <Button color="primary">Play</Button>
      <Button color="secondary" onClick={() => pushScreen("privateLobby")}>
        Create Private Room
      </Button>
    </>
  );
}

function OfflineMenu() {
  const { popScreen } = useScreenStack();
  return (
    <>
      <H1 className="text-center py-4">Welcome to Tanks!</H1>
      <IconButton onClick={() => popScreen()} icon={<ArrowLeft />} />
      <Button color="primary">Single Player</Button>
      <Button color="secondary">Two Players</Button>
    </>
  );
}

function QuickMatchLobbyRoom() {
  const { popScreen } = useScreenStack();

  useEffect(() => {}, []);

  return (
    <>
      <H1 className="text-center py-4">Waiting for other people to join...</H1>

      <Loader />

      <Button
        color="primary"
        onClick={() => {
          popScreen();
        }}
      >
        cancel
      </Button>
    </>
  );
}
