export default interface ProblemDetail {
  title: string;
  status: number;
  type: string;
  instance: string;
  detail?: string;
  errors?: Record<string, any>[];
}
