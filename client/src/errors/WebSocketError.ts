import type ProblemDetailDto from "../api/http/dto/ProblemDetailDto";

export default class WebSocketError extends Error {
  public problemDetail: ProblemDetailDto

  constructor(problemDetail: ProblemDetailDto) {
    super(problemDetail.title);
    this.problemDetail = problemDetail;
  }
}
