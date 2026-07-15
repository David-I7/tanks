import { create } from "zustand";
import TanksClient from "../api/http/TanksClient";
import LogoutRequest from "../api/http/requests/auth/LogoutRequest";
import type User from "../api/http/dto/UserDto";
import RefreshRequest from "../api/http/requests/auth/RefreshRequest";
import type { TanksRequest } from "../api/http/requests/TanksRequest";
import type RefreshResponseDto from "../api/http/dto/RefreshResponseDto";
import { ApiError } from "../errors/ApiError";
import type AuthStatusResponseDto from "../api/http/dto/AuthStatusResponseDto";
import type { UserSessionStatus } from "../api/http/dto/AuthStatusResponseDto";
import AuthStatusRequest from "../api/http/requests/auth/AuthStatusRequest";
import InvalidStateError from "../errors/InvalidStateError";

type AuthState = {
  initialized: boolean;

  user: User | null;
  userStatus: UserSessionStatus | null;
  accessToken: string | null;

  logout: () => Promise<void>;
  login: (
    loginRequest: TanksRequest<RefreshResponseDto>,
  ) => Promise<RefreshResponseDto>;
  refresh: () => Promise<RefreshResponseDto>;
  status: () => Promise<AuthStatusResponseDto>;
};

export const useAuthStore = create<AuthState>((set, get) => {
  const tanksClient = new TanksClient();

  function handleError(err: unknown) {
    if (err instanceof ApiError) {
      if (err.status === 401 || err.status === 403) {
        set((_) => ({
          authState: "unauthenticated",
          user: null,
          userStatus: null,
          accessToken: null,
        }));
        TanksClient.setAccessToken("");
      }
    }
  }

  async function status(): Promise<AuthStatusResponseDto> {
    if (get().user === null)
      throw new InvalidStateError(
        "User status can only be requested only if he is authenticated",
      );

    try {
      const data = await tanksClient.send(new AuthStatusRequest());
      set((prev) => ({
        ...prev,
        user: data.user,
        userStatus: data.userSessionStatus,
      }));
      return data;
    } catch (err) {
      handleError(err);
      throw err;
    }
  }

  async function refresh() {
    try {
      const response = await tanksClient.send(new RefreshRequest());
      TanksClient.setAccessToken(response.accessToken);
      set({
        accessToken: response.accessToken,
        user: response.user,
        userStatus: null,
      });
      return response;
    } catch (err) {
      handleError(err);
      throw err;
    } finally {
      const isInitialized = get().initialized;
      if (!isInitialized) {
        set({ initialized: true });
      }
    }
  }

  async function login(request: TanksRequest<RefreshResponseDto>) {
    try {
      const data = await tanksClient.send(request);
      TanksClient.setAccessToken(data.accessToken);
      set({
        accessToken: data.accessToken,
        user: data.user,
        userStatus: null,
      });
      return data;
    } catch (err) {
      handleError(err);
      throw err;
    }
  }

  async function logout() {
    try {
      await new TanksClient().send(new LogoutRequest());
      TanksClient.setAccessToken("");
      set({
        accessToken: null,
        user: null,
        userStatus: null,
      });
    } catch (err) {
      handleError(err);
      throw err;
    }
  }

  TanksClient.setRefreshHandler(refresh);

  return {
    initialized: false,

    user: null,
    userStatus: null,
    accessToken: null,

    login,
    logout,
    refresh,
    status,
  };
});
