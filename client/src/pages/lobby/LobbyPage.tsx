import { useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import PrivateLobbyRoom from "./PrivateLobbyRoom";
import { useAssetStore } from "../../store/useAssetStore";
import TankSelector from "../../components/game/TankSelector";
import Surface from "../../components/layouts/Surface";
import H1 from "../../components/headings/H1";

export default function LobbyPage() {
  const { id } = useParams();
  const selectedTank = useAssetStore((state) => state.selectedTank);

  if (!uuidSchema.safeParse(id).success) throw new Error("Invalid lobby id");

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
