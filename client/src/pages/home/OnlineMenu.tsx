import { ArrowLeft, Loader } from "lucide-react";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import H1 from "../../components/headings/H1";
import { useScreenStack } from "../../context/ScreenStack";
import type { HomeScreenStack } from "./HomePage";
import { useAuthStore } from "../../store/useAuthStore";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function OnlineMenu() {
    const { popScreen, pushScreen } = useScreenStack<HomeScreenStack>();
    const { getAuthStatus } = useAuthStore();
    const [gameId, setGameId] = useState<string | null | undefined>(undefined);
    const navigate = useNavigate();

    useEffect(() => {
        (async () => {
            const status = await getAuthStatus();

            if (
                status?.userSessionStatus === null ||
                status?.userSessionStatus?.state !== "IN_GAME"
            ) {
                setGameId(null);
            } else setGameId(status.userSessionStatus.gameId);
        })();
    }, [getAuthStatus]);

    return (
        <div className="cyber-panel px-8 py-8 w-full max-w-sm flex flex-col gap-5 text-center relative pt-14">
            <div className="absolute top-4 left-4">
                <IconButton onClick={() => popScreen()} icon={<ArrowLeft size={16} />} />
            </div>
            <H1 className="text-center mb-2">Online</H1>
            {
                gameId === null && (<>
                    <Button color="primary" onClick={() => pushScreen("quickMatchLobby")}>
                        Play Quick Match
                    </Button>
                    <Button color="secondary" onClick={() => pushScreen("privateLobby")}>
                        Create Private Room
                    </Button>
                </>
                )
            }
            {
                gameId === undefined && <Loader />
            }
            {
                gameId !== undefined && gameId !== null &&
                <Button color="secondary" onClick={() => navigate(`/game/${gameId}`)}>
                    Resume Game
                </Button>
            }
        </div>
    );
}

