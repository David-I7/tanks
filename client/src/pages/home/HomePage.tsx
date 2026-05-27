import { Link, useNavigate } from "react-router-dom";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import ScreenStackProvider, { useScreenStack } from "../../context/ScreenStack";
import IconButton from "../../components/buttons/IconButton";
import { ArrowLeft } from "lucide-react";
import { useFetch } from "../../hooks/useFetch";
import TanksClient from "../../api/http/TanksClient";
import CreatePrivateLobbyRequest from "../../api/http/requests/lobby/CreatePrivateLobbyRequest";
import Loader from "../../components/misc/Loader";
import { useEffect } from "react";
import AuthenticatedRoute from "../../components/auth/AuthenticatedRoute";

type Screen = "onlineMenu" | "root" | "offlineMenu";

export default function HomePage() {
  const screens = {
    root: <RootState />,
    onlineMenu: (
      <AuthenticatedRoute>
        <OnlineMenu />
      </AuthenticatedRoute>
    ),
    offlineMenu: <OfflineMenu />,
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
    </>
  );
}

async function createPrivateLobby() {
  return new TanksClient().send(new CreatePrivateLobbyRequest());
}

function OnlineMenu() {
  const { popScreen } = useScreenStack();
  const { data, trigger, loading } = useFetch(createPrivateLobby, false);
  const navigate = useNavigate();

  useEffect(() => {
    if (data === null) return;

    navigate(`/lobby/${data.id}`, { state: { type: "LOBBY_CREATED" } });
  }, [data]);

  return (
    <>
      <H1 className="text-center py-4">Welcome to Tanks!</H1>
      <IconButton onClick={() => popScreen()} icon={<ArrowLeft />} />
      <Button color="primary">Play</Button>
      <Button color="secondary" onClick={() => trigger()}>
        {loading ? <Loader /> : "Create Private Room"}
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

function MatchMakingScreen() {
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
