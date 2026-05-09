import axios, { isAxiosError, type AxiosInstance } from "axios";
import type { TanksRequest } from "./TanksRequest";
import { ApiError } from "../../errors/ApiError";
import type ProblemDetail from "./dto/ProblemDetail";
import NetworkError from "../../errors/NetworkError";

export default class TanksClient {
  private api: AxiosInstance;

  constructor(options: { accessToken?: string | null }) {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_BASE_URL.concat("/api/v1"),
      headers: options.accessToken
        ? { Authorization: `Bearer ${options.accessToken}` }
        : {},
      withCredentials: true,
    });
  }

  async send<T>(request: TanksRequest<T>): Promise<T> {
    try {
      const response = await this.api.request<T>({
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
