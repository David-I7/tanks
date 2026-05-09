import type ProblemDetail from "../api/http/dto/ProblemDetail";

export class ApiError extends Error {
  constructor(
    public readonly data: ProblemDetail,
    public readonly status: number,
  ) {
    super(data.detail ? data.detail : data.title);
  }
}
