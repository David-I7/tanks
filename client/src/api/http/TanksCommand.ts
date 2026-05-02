import type { Method } from "axios";

export abstract class TanksCommand<T> {
  declare readonly _responseType?: T;

  abstract getPath(): string;
  abstract getMethod(): Method;

  getHeaders(): Record<string, any> | undefined {
    return undefined;
  }

  getBody(): any {
    return undefined;
  }

  getParams(): Record<string, any> | undefined {
    return undefined;
  }
}
