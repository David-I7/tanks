import { ArrowLeft } from "lucide-react";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import H1 from "../../components/headings/H1";
import { useScreenStack } from "../../context/ScreenStack";
import type { HomeScreenStack } from "./HomePage";
import { useWebSocketStore } from "../../store/useWebSocketStore";
import { useEffect } from "react";

export default function OnlineMenu() {
    const { popScreen, pushScreen } = useScreenStack<HomeScreenStack>();
    useOnlineMenu();

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

function useOnlineMenu() {
    const { client, connect, disconnect } = useWebSocketStore();

    useEffect(() => {
        if (!client) {
            connect();
        }
    }, [client]);

    useEffect(() => {
        return () => disconnect();
    }, []);
}