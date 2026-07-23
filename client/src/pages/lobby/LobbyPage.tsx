import { useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import PrivateLobbyRoom from "./PrivateLobbyRoom";
import { useAssetStore } from "../../store/useAssetStore";
import TankSelector from "../../components/game/TankSelector";
import Surface from "../../components/layouts/Surface";
import H1 from "../../components/headings/H1";
import PageNotFoundError from "../../errors/PageNotFoundError";
import { useAuthStore } from "../../store/useAuthStore";
import { useEffect, useState } from "react";
import InvalidStateError from "../../errors/InvalidStateError";
import UiError from "../../errors/UiError";

export default function LobbyPage() {
  const { id } = useParams();
  const selectedTank = useAssetStore((state) => state.selectedTank);
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

function useCheckValidLobbySession({ id }: { id: string | undefined }) {
  const userStatus = useAuthStore((state) => state.userStatus);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Should never happen because of RefreshUserStatusDecorator
    if (userStatus === null)
      throw new InvalidStateError(
        "User status is null, but should be initialized",
      );

    if (userStatus.state === "IN_LOBBY") {
      throw new UiError({
        description: "You are currently in a lobby in another tab or window.",
        heading: "In a lobby",
      });
    }

    if (!id || !uuidSchema.safeParse(id).success) {
      if (!uuidSchema.safeParse(id).success)
        throw new PageNotFoundError("/lobby/" + id);
    }

    setChecked(true);
  }, [userStatus, id]);

  return checked;
}
