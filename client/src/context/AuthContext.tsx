import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import TanksClient from "../api/http/TanksClient";
import { ApiError } from "../errors/ApiError";
import LogoutRequest from "../api/http/requests/LogoutRequest";
import type User from "../api/http/dto/UserDto";
import GoogleLoginRequest from "../api/http/requests/GoogleLoginRequest";
import type LoginRequestDto from "../api/http/dto/LoginRequestDto";
import LoginRequest from "../api/http/requests/LoginRequest";
import RegisterRequest from "../api/http/requests/RegisterRequest";
import type RegisterRequestDto from "../api/http/dto/RegisterRequestDto";
import RefreshRequest from "../api/http/requests/RefreshRequest";

type AuthContextState = {
  user: User | undefined | null;
  accessToken: string | null;
  handleLogout: () => Promise<void>;
  handleLogin: (loginRequest: LoginRequestDto) => Promise<void>;
  handleRegister: (registerRequest: RegisterRequestDto) => Promise<void>;
  handleGoogleLogin(): Promise<void>;
};

export const AuthContext = createContext<AuthContextState | undefined>(
  undefined,
);

const useAuthContext = (): AuthContextState => {
  const [user, setUser] = useState<AuthContextState["user"]>(undefined);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  async function handleLogin(loginRequest: LoginRequestDto) {
    try {
      const { user, accessToken: token } = await new TanksClient().send(
        new LoginRequest(loginRequest),
      );

      TanksClient.setAccessToken(token);
      setAccessToken(token);
      setUser(user);
    } catch (err) {
      setAccessToken(null);
      setUser(null);
    }
  }

  async function handleRegister(registerRequest: RegisterRequestDto) {
    try {
      const { user, accessToken: token } = await new TanksClient().send(
        new RegisterRequest(registerRequest),
      );

      TanksClient.setAccessToken(token);
      setAccessToken(token);
      setUser(user);
    } catch (err) {
      setAccessToken(null);
      setUser(null);
    }
  }

  async function handleGoogleLogin() {
    try {
      const { user, accessToken: token } = await new TanksClient().send(
        new GoogleLoginRequest(),
      );

      TanksClient.setAccessToken(token);
      setAccessToken(token);
      setUser(user);
    } catch (err) {
      setAccessToken(null);
      setUser(null);
    }
  }

  async function handleLogout() {
    try {
      await new TanksClient().send(new LogoutRequest());

      TanksClient.setAccessToken("");
      setAccessToken(null);
      setUser(null);
    } catch (err) {
      throw err;
    }
  }

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await new TanksClient().send(new RefreshRequest());

        TanksClient.setAccessToken(response.accessToken);
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

  return {
    user,
    accessToken,
    handleGoogleLogin,
    handleLogin,
    handleLogout,
    handleRegister,
  };
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
