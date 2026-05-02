import { createContext, useContext, useState, type ReactNode } from "react";
import TanksClient from "../api/http/TanksClient";
import type { User } from "../state/auth";
import LoginCommand from "../api/http/LoginCommand";

type AuthContextState = {
  user: User | undefined | null;
  accessToken: string | null;
  handleLogout: () => Promise<void>;
  handleLogin: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextState | undefined>(
  undefined,
);

const useAuthContext = (): AuthContextState => {
  const [user, setUser] = useState<AuthContextState["user"]>(undefined);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  async function handleLogin() {
    try {
      const { user, accessToken: token } = await new TanksClient({
        accessToken,
      }).send(new LoginCommand({ username: "a", password: "a" }));

      setAccessToken(token);
      setUser(user);
    } catch (err) {
      setAccessToken(null);
      setUser(null);
    }
  }

  async function handleLogout() {
    setAccessToken(null);
    setUser(null);
  }

  return { user, accessToken, handleLogin, handleLogout };
};

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth can only be used inside an AuthProvider");
  return auth;
}

type AuthProviderProps = { children: ReactNode };

export default function AuthProvider({ children }: AuthProviderProps) {
  return (
    <AuthContext.Provider value={useAuthContext()}>
      {children}
    </AuthContext.Provider>
  );
}
