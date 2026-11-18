import type { Method } from "axios";

export abstract class TanksRequest<Data> {
  declare readonly _responseType?: Data;

  abstract getPath(): string;
  abstract getMethod(): Method;

  getHeaders(): Record<string, string> | undefined {
    return undefined;
  }

  getBody(): unknown {
    return undefined;
  }

  getParams(): Record<string, unknown> | undefined {
    return undefined;
  }
}
