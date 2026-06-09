import { createContext, useContext, type ReactNode } from "react";
import TanksClient from "../api/http/TanksClient";
import LogoutRequest from "../api/http/requests/auth/LogoutRequest";
import type User from "../api/http/dto/UserDto";
import type LoginRequestDto from "../api/http/dto/LoginRequestDto";
import LoginRequest from "../api/http/requests/auth/LoginRequest";
import RegisterRequest from "../api/http/requests/auth/RegisterRequest";
import type RegisterRequestDto from "../api/http/dto/RegisterRequestDto";
import RefreshRequest from "../api/http/requests/auth/RefreshRequest";
import type PostOauth2LoginRequestDto from "../api/http/dto/PostOauth2LoginRequestDto";
import PostOauth2LoginRequest from "../api/http/requests/auth/PostOAuth2LoginRequest";
import type PostOauth2RegisterRequestDto from "../api/http/dto/PostOauth2RegisterRequestDto";
import PostOauth2RegisterRequest from "../api/http/requests/auth/PostOauth2RegisterRequest";
import type { TanksRequest } from "../api/http/requests/TanksRequest";
import type RefreshResponseDto from "../api/http/dto/RefreshResponseDto";
import TanksWSClient from "../api/ws/TanksWebSocketClient";
import { useFetch } from "../hooks/useFetch";
import { ApiError } from "../errors/ApiError";

type UseFetchReturnType = ReturnType<typeof useFetch<RefreshResponseDto>>;

type AuthContextState = {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  state: UseFetchReturnType["state"];
  error: UseFetchReturnType["error"];
  handleLogout: () => Promise<void>;
  handleLogin: (loginRequest: LoginRequestDto) => Promise<void>;
  handleRegister: (registerRequest: RegisterRequestDto) => Promise<void>;
  handlePostOAuth2Register(
    registerRequest: PostOauth2RegisterRequestDto,
  ): Promise<void>;
  handlePostOAuth2Login(loginRequest: PostOauth2LoginRequestDto): Promise<void>;
  handleRefresh: () => Promise<RefreshResponseDto>;
};

export const AuthContext = createContext<AuthContextState | undefined>(
  undefined,
);

async function handleRefreshUser() {
  try {
    const response = await new TanksClient().send(new RefreshRequest());
    TanksClient.setAccessToken(response.accessToken);

    return response;
  } catch (err) {
    TanksClient.setAccessToken("");
    throw err;
  }
}

const useAuthContext = (): AuthContextState => {
  const { data, error, loading, state, setData, setIdle, setError } =
    useFetch(handleRefreshUser);

  const tanksClient = new TanksClient();

  async function handleFormAuthentication(
    request: TanksRequest<RefreshResponseDto>,
  ) {
    try {
      const data = await tanksClient.send(request);

      TanksClient.setAccessToken(data.accessToken);
      setData(data);
    } catch (err) {
      throw err;
    }
  }

  async function handleLogin(loginRequest: LoginRequestDto) {
    await handleFormAuthentication(new LoginRequest(loginRequest));
  }

  async function handleRegister(registerRequest: RegisterRequestDto) {
    await handleFormAuthentication(new RegisterRequest(registerRequest));
  }

  async function handlePostOAuth2Login(request: PostOauth2LoginRequestDto) {
    await handleFormAuthentication(new PostOauth2LoginRequest(request));
  }

  async function handlePostOAuth2Register(
    request: PostOauth2RegisterRequestDto,
  ) {
    await handleFormAuthentication(new PostOauth2RegisterRequest(request));
  }

  async function handleLogout() {
    try {
      await new TanksClient().send(new LogoutRequest());

      TanksClient.setAccessToken("");
      setIdle();
    } catch (err) {
      throw err;
    }
  }

  async function handleRefresh() {
    try {
      const response = await handleRefreshUser();
      setData(response);
      return response;
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setIdle();
        setError(err);
      }
      throw err;
    }
  }

  TanksClient.setRefreshHandler(handleRefresh);

  return {
    user: data !== null ? data.user : null,
    accessToken: data !== null ? data.accessToken : null,
    error,
    loading,
    state,
    handlePostOAuth2Login,
    handlePostOAuth2Register,
    handleLogin,
    handleLogout,
    handleRegister,
    handleRefresh,
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
