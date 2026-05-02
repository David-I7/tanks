import type ErrorResponse from "../api/http/dto/ErrorResponse";

export class ApiError extends Error {
  constructor(
    public readonly data: ErrorResponse,
    public readonly status: number,
  ) {
    super(data.error);
  }
}
