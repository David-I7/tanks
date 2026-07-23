import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Loader from "../../components/misc/Loader";
import IconButton from "../../components/buttons/IconButton";
import useGameSession from "./useGameSession";
import { useAuthStore } from "../../store/useAuthStore";
import InvalidStateError from "../../errors/InvalidStateError";
import UiError from "../../errors/UiError";

export default function GamePage() {
  const { id } = useParams();
  const checked = useCheckValidGameSession({ id });

  if (!checked) {
    return null;
  }

  return <GameView gameSessionId={id!} />;
}

function useCheckValidGameSession({ id }: { id: string | undefined }) {
  const userStatus = useAuthStore((state) => state.userStatus);
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (userStatus === null)
      throw new InvalidStateError(
        "User status is null, but should be initialized",
      );

    if (userStatus.state !== "IN_GAME") {
      if (userStatus.state === "IDLE") {
        throw new UiError({
          description:
            "You are not currently in a game. Please join a game session first.",
          heading: "Not in a game session",
        });
      } else if (userStatus.state === "IN_LOBBY") {
        throw new UiError({
          description:
            "You are currently in a lobby. Please join a game session from the lobby.",
          heading: "In a lobby",
        });
      }
    }

    if (userStatus.gameId !== id) {
      navigate(`/game/${userStatus.gameId}`, { replace: true });
    }

    setChecked(true);
  }, [userStatus, id]);

  return checked;
}

function GameView({ gameSessionId }: { gameSessionId: string }) {
  const navigate = useNavigate();
  const { state } = useGameSession(gameSessionId);

  return (
    <main className="relative z-10 flex min-h-screen flex-col bg-background p-4 text-text-body-high">
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <IconButton
            onClick={() => navigate("/")}
            icon={<ArrowLeft size={16} />}
          />
          <h1 className="font-heading text-xl font-bold tracking-wide text-primary">
            Game Session
          </h1>
        </div>
        <div className="text-sm font-medium text-text-body-muted">
          Active Session
        </div>
      </header>

      <div className="relative flex flex-1 flex-col items-center justify-center rounded border border-border-main bg-background-high p-8 shadow-lg">
        {state === "connecting_to_game" || state === "reconnecting_to_game" ? (
          <div className="flex flex-col items-center gap-4">
            <Loader />
            <p className="text-lg font-medium text-text-body-muted">
              {state === "connecting_to_game"
                ? "Connecting to game session..."
                : "Reconnecting to game session..."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="rounded-full bg-primary/10 p-4 text-primary font-semibold text-lg">
              Game Session Active
            </div>
            <p className="max-w-md text-text-body-muted">
              Connected to game session successfully.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
