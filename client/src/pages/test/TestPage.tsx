import React, { createContext, useContext, useState } from "react";
import H1 from "../../components/headings/H1";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import { ArrowLeft } from "lucide-react";
import StateMachineProvider, {
  useScreenStack,
} from "../../context/ScreenStack";

export default function TestPage() {
  const screens = {
    root: <RootState />,
    onlineMenu: <OnlineMenu />,
    offlineMenu: <OfflineMenu />,
  };
  return (
    <StateMachineProvider screens={screens}>
      <Layout />
    </StateMachineProvider>
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
  const { pushScreen, state } = useScreenStack();
  const [count, setCount] = useState(state ?? 0);
  return (
    <>
      <H1 className="text-center py-4">Welcome to Tanks!</H1>
      <Button onClick={() => pushScreen("onlineMenu", count)} color="primary">
        Online
      </Button>
      <Button
        onClick={() => pushScreen("offlineMenu", count)}
        color="secondary"
      >
        Offline
      </Button>
      <Button color="primary" onClick={() => setCount(count + 1)}>
        Increment
      </Button>
      {count}
    </>
  );
}

function OnlineMenu() {
  const { popScreen } = useScreenStack();
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
