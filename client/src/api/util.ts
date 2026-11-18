import { isAxiosError } from "axios";
import type ProblemDetailDto from "./dto/ProblemDetailDto";

export const getErrorMessage = (err: unknown, fallback?: string): string => {
  if (isAxiosError<ProblemDetailDto>(err)) {
    if (err.response) {
      // Server responded with an error
      return (
        err.response.data.detail ||
        fallback ||
        err.response.data.title ||
        "An unexpected error occurred"
      );
    } else if (err.request) {
      // Request was made but no response received
      return "No response received from the server. Please check your network connection.";
    }
  }

  if (err instanceof Error) {
    return err.message || fallback || "An unexpected error occurred";
  }

  return fallback || "An unexpected error occurred while sending the request.";
};
