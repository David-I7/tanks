import { Link } from "react-router-dom";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import ScreenStackProvider, { useScreenStack } from "../../context/ScreenStack";
import IconButton from "../../components/buttons/IconButton";
import { ArrowLeft } from "lucide-react";
import TanksWebSocketClient from "../../api/ws/TanksWebSocketClient";
import { useEffect } from "react";

export default function HomePage() {
  const screens = {
    root: <RootState />,
    onlineMenu: <OnlineMenu />,
    offlineMenu: <OfflineMenu />,
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
    <div className="p-4 md:p-6 lg:p-8 h-screen min-h-screen grid place-items-center">
      <div className="bg-surface-high">{screen}</div>
    </div>
  );
}

function RootState() {
  const { pushScreen } = useScreenStack();
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

function OnlineMenu() {
  const { popScreen } = useScreenStack();

  // useEffect(() => {
  //   const client = new TanksWebSocketClient();

  //   return () => {
  //     client.disconnect();
  //   };
  // }, []);

  return (
    <>
      <H1 className="text-center py-4">Welcome to Tanks!</H1>
      <IconButton onClick={() => popScreen()} icon={<ArrowLeft />} />
      <Button color="primary">Play</Button>
      <Button color="secondary">Create Private Room</Button>
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
