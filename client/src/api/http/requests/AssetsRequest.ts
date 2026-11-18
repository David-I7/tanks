import type { Method } from "axios";
import { TanksRequest } from "./TanksRequest";
import type { GameContent } from "../../../features/game/types/content";

export default class AssetsRequest extends TanksRequest<GameContent> {
  getPath(): string {
    return "/assets/content";
  }
  getMethod(): Method {
    return "GET";
  }
}
