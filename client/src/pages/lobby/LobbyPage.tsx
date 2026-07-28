import { useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import PrivateLobbyRoom from "./PrivateLobbyRoom";
import { useAssetStore } from "../../store/useAssetStore";
import TankSelector from "../../components/game/TankSelector";
import Surface from "../../components/layouts/Surface";
import H1 from "../../components/headings/H1";
import PageNotFoundError from "../../errors/PageNotFoundError";
import UiError from "../../errors/UiError";
import { useAssetQuery } from "../../hooks/useAssetQuery";

export default function LobbyPage() {
  const { id } = useParams();
  const { data: tanks } = useAssetQuery();
  const selectedTankId = useAssetStore((state) => state.selectedTankId);
  const selectedTank = tanks?.find((t) => t.id === selectedTankId) || null;
  const checked = useCheckValidLobbySession({ id });

  if (!checked) {
    return null;
  }

  if (!selectedTank) {
    return (
      <Surface className="px-8 py-8 w-full max-w-md flex flex-col gap-5 text-center relative z-10">
        <H1 className="text-xl text-center mb-1">Join Private Room</H1>
        <p className="text-xs text-text-body-muted">
          Select your tank before entering the room lobby.
        </p>

        <TankSelector label="Select Your Tank" />
      </Surface>
    );
  }

  return <PrivateLobbyRoom />;
}

import { useUserStatusQuery } from "../../hooks/useUserStatusQuery";

function useCheckValidLobbySession({ id }: { id: string | undefined }) {
  const { data: userStatus, isPending } = useUserStatusQuery();

  if (isPending) return false;

  if (userStatus == null) return true;

  if (userStatus.state === "IN_LOBBY" && userStatus.lobbyId !== id) {
    throw new UiError({
      description: "You are currently in a lobby in another tab or window.",
      heading: "In a lobby",
    });
  }

  if (!id || !uuidSchema.safeParse(id).success) {
    if (!uuidSchema.safeParse(id).success)
      throw new PageNotFoundError("/lobby/" + id);
  }

  return true;
}
