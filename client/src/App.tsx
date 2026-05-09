import { useAuth } from "./context/AuthContext";

export default function App() {
  const { user } = useAuth();

  if (user === undefined) return <div>Loading user info...</div>;
  else if (user === null) {
  } else {
    return <h1>Welcome {user.username}!</h1>;
  }
}
