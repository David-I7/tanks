import type ProblemDetailDto from "../api/dto/ProblemDetailDto";

export default class WebSocketError extends Error {
  public problemDetail: ProblemDetailDto;

  constructor(problemDetail: ProblemDetailDto) {
    super(problemDetail.title);
    this.problemDetail = problemDetail;
  }
}
