import type ProblemDetailDto from "../api/dto/ProblemDetailDto";

export class ApiError extends Error {
  constructor(
    public readonly data: ProblemDetailDto,
    public readonly status: number,
  ) {
    super(data.detail || data.title || "An unexpected error occurred");
  }
}
