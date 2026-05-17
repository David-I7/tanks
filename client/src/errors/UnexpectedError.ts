export default class UnexpectedError extends Error {
  constructor(message?: string) {
    super(
      message ||
        "An unexpected error has occurred. Please contact our team to help fix this bug!",
    );
  }
}
