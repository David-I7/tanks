import { useParams } from "react-router-dom";
import { uuidSchema } from "../../validation/lobby";
import PrivateLobbyRoom from "./PrivateLobbyRoom";
import { WebSocketProvider } from "../../context/WebSocketContext";

export default function LobbyPage() {
  const { id } = useParams();

  if (!uuidSchema.safeParse(id).success) throw new Error("Invalid lobby id");

  return (
    <WebSocketProvider>
      <PrivateLobbyRoom />;
    </WebSocketProvider>
  );
}
