import axios, { isAxiosError, type AxiosInstance } from "axios";
import type { TanksCommand } from "./TanksCommand";
import { ApiError } from "../../errors/ApiError";
import type ErrorResponse from "./dto/ErrorResponse";
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

  async send<T>(command: TanksCommand<T>): Promise<T> {
    try {
      const response = await this.api.request<T>({
        url: command.getPath(),
        method: command.getMethod(),
        headers: command.getHeaders(),
        data: command.getBody(),
        params: command.getParams(),
      });

      return response.data;
    } catch (err) {
      if (isAxiosError<ErrorResponse>(err) && err.response) {
        throw new ApiError(err.response.data, err.response.status!);
      }

      throw new NetworkError("Failed to fetch the resource");
    }
  }
}
