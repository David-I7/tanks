import { useParams } from "react-router-dom";
import H1 from "../../components/headings/H1";
import { useAuth } from "../../context/AuthContext";
import Logout from "../../components/auth/Logout";

export default function LobbyPage() {
  const { user } = useAuth();
  const { id } = useParams();

  return (
    <div>
      <H1>Welcome {user!.username}!</H1>
      <div>Lobby id: {id}</div>
      <Logout color="primary" onSuccess={() => {}} onFailure={(err) => {}} />
    </div>
  );
}
