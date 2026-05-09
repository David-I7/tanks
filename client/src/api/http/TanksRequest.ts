import type { Method } from "axios";

export abstract class TanksRequest<Data> {
  declare readonly _responseType?: Data;

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
