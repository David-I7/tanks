import Camera from "./Camera.js";
import Terrain from "./entities/Terrain.js";
import { InputManager } from "../input/InputManager.js";

export default class CameraController {
  private isDragging: boolean = false;

  constructor(
    private camera: Camera,
    private input: InputManager,
    private terrain: Terrain,
  ) {}
}
