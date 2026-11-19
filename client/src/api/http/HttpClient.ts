import { isAxiosError, type AxiosInstance } from "axios";
import type { TanksRequest } from "./requests/TanksRequest";
import { ApiError } from "../../errors/ApiError";
import type ProblemDetail from "../dto/ProblemDetailDto";
import NetworkError from "../../errors/NetworkError";
import client from "../client";
import InvalidStateError from "../../errors/InvalidStateError";

export default class HttpClient {
  private api: AxiosInstance = client;

  constructor() {}

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
      if (isAxiosError<ProblemDetail>(err)) {
        if (err.response) {
          // Server responded with an error
          throw new ApiError(err.response.data, err.response.status!);
        } else if (err.request) {
          // Request was made but no response received
          throw new NetworkError(
            "No response received from the server. Please check your network connection.",
          );
        }
      }

      throw new InvalidStateError(
        "An unexpected error occurred while sending the request.",
      );
    }
  }
}
