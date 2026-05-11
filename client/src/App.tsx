import { useAuth } from "./context/AuthContext";
import AuthPage from "./pages/auth/AuthenticationPage";

export default function App() {
  const { user } = useAuth();

  return (
    <main className="bg-background font-body text-text-body">
      {user === undefined && <div>Loading user info...</div>}
      {user === null && <AuthPage />}
      {user && <h1>Welcome {user.username}!</h1>}
    </main>
  );
}
