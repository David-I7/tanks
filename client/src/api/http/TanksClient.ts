import axios, {
  AxiosError,
  isAxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";
import type { TanksRequest } from "./requests/TanksRequest";
import { ApiError } from "../../errors/ApiError";
import type ProblemDetail from "./dto/ProblemDetailDto";
import NetworkError from "../../errors/NetworkError";
import type RefreshResponseDto from "./dto/RefreshResponseDto";

interface RetryableRequest extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export default class TanksClient {
  private static api: AxiosInstance;
  private static handleRefresh: () => Promise<RefreshResponseDto>;
  private static refreshPromise: Promise<RefreshResponseDto> | null = null;

  static {
    TanksClient.api = axios.create({
      baseURL: import.meta.env.VITE_BASE_API_URL,
      withCredentials: true,
    });
    TanksClient.api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as RetryableRequest;

        if (
          error.response?.status !== 401 ||
          !originalRequest ||
          originalRequest._retry ||
          originalRequest.url?.endsWith("/refresh")
        ) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        try {
          if (TanksClient.refreshPromise === null) {
            TanksClient.refreshPromise = TanksClient.handleRefresh();
          }
          await TanksClient.refreshPromise;

          return TanksClient.api(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        } finally {
          TanksClient.refreshPromise = null;
        }
      },
    );
  }

  constructor() { }

  static setRefreshHandler(refreshHandler: typeof TanksClient.handleRefresh) {
    TanksClient.handleRefresh = refreshHandler;
  }

  static setAccessToken(accessToken: string): void {
    TanksClient.api.interceptors.request.clear();

    if (accessToken === "") return;

    TanksClient.api.interceptors.request.use((config) => {
      config.headers.set("Authorization", `Bearer ${accessToken}`);
      return config;
    });
  }

  async send<T>(request: TanksRequest<T>): Promise<T> {
    try {
      const response = await TanksClient.api.request<T>({
        url: request.getPath(),
        method: request.getMethod(),
        headers: request.getHeaders(),
        data: request.getBody(),
        params: request.getParams(),
      });

      return response.data;
    } catch (err) {
      if (isAxiosError<ProblemDetail>(err) && err.response) {
        throw new ApiError(err.response.data, err.response.status!);
      }

      throw new NetworkError("Server is unavailable. Please try again later");
    }
  }
}
