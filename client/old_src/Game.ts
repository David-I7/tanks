// import Terrain from "./ui/entities/Terrain.js";
// import { InputManager } from "./input/InputManager.js";
// import ResourceManager, { Resources } from "./ResourceManager.js";
// import Tank from "./ui/entities/Tank.js";
// import Renderer from "./rendering/Renderer.js";
// import CameraController from "./ui/CameraController.js";
// import Viewport from "./ui/Viewport.js";

// class Game {
//   resources!: Resources;
//   terrain!: Terrain;
//   tank!: Tank;
//   cameraController!: CameraController;
//   input!: InputManager;

//   constructor(
//     private width: number,
//     private height: number,
//     private renderer: Renderer,
//     private viewport: Viewport,
//   ) {
//     this.renderer = renderer;
//   }

//   async init() {
//     this.resources = await ResourceManager.load();
//     this.terrain = new Terrain(
//       this.viewport.getWidth() * 3,
//       this.viewport.getHeight(),
//     );
//     this.tank = new Tank(
//       this.resources.graphics["tank"],
//       this.terrain,
//       this.input,
//       this.renderer.camera,
//       this.settings,
//     );
//     this.cameraController = new CameraController(
//       this.renderer.camera,
//       this.input,
//       this.terrain,
//       this.settings,
//     );
//     this.input = new InputManager();
//   }

//   update(dt: number) {
//     this.input.update();
//     this.cameraController.update(dt);
//     this.tank.update(dt);
//   }

//   render() {
//     this.renderer.begin();

//     this.renderer.enqueue(this.terrain);
//     this.renderer.enqueue(this.tank);

//     this.renderer.flush();

//     // DEBUG: draw camera origin
//     const ctx = this.renderer.getContext();
//     ctx.beginPath();
//     ctx.arc(this.renderer.camera.x, this.renderer.camera.y, 5, 0, Math.PI * 2);
//     ctx.fillStyle = "red";
//     ctx.fill();
//   }
// }
// export default Game;
