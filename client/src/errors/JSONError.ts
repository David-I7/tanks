export class JSONError extends Error {
  constructor(public readonly message: string) {
    super(message);
  }
}
