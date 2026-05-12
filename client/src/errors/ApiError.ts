import type ProblemDetailDto from "../api/http/dto/ProblemDetailDto";

export class ApiError extends Error {
  constructor(
    public readonly data: ProblemDetailDto,
    public readonly status: number,
  ) {
    super(data.detail ? data.detail : data.title);
  }
}
