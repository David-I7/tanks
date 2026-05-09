import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import TanksClient from "../api/http/TanksClient";
import type { User } from "../state/auth";
import LoginRequest from "../api/http/LoginRequest";
import RefreshRequest from "../api/http/RefreshRequest";
import { ApiError } from "../errors/ApiError";
import LogoutRequest from "../api/http/LogoutRequest";

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
      }).send(new LoginRequest({ username: "a", password: "a" }));

      setAccessToken(token);
      setUser(user);
    } catch (err) {
      setAccessToken(null);
      setUser(null);
    }
  }

  async function handleLogout() {
    try {
      await new TanksClient({}).send(new LogoutRequest());

      setAccessToken(null);
      setUser(null);
    } catch (err) {
      throw err;
    }
  }

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await new TanksClient({}).send(new RefreshRequest());

        setAccessToken(response.accessToken);
        setUser(response.user);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setAccessToken(null);
            setUser(null);
          }
        } else {
          throw err;
        }
      }
    }

    fetchUser();
  }, []);

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
