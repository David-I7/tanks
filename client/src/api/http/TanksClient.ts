import axios, { isAxiosError, type AxiosInstance } from "axios";
import type { TanksRequest } from "./requests/TanksRequest";
import { ApiError } from "../../errors/ApiError";
import type ProblemDetail from "./dto/ProblemDetailDto";
import NetworkError from "../../errors/NetworkError";

export default class TanksClient {
  private static api: AxiosInstance;

  constructor() {
    TanksClient.api = axios.create({
      baseURL: import.meta.env.VITE_BASE_API_URL,
      withCredentials: true,
    });
  }

  static setAccessToken(accessToken: string): void {
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

      throw new NetworkError("Failed to fetch the resource");
    }
  }
}
