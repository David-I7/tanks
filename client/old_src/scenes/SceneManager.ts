import GameScene from "./states/GameScene.js";
import Scene, { EnterContext } from "./states/Scene.js";

type SceneName = "gameScene";

class SceneManager {
  private current: Scene;
  private scenes: Record<SceneName, Scene> = {
    gameScene: new GameScene(),
  };

  constructor() {
    this.current = this.scenes.gameScene;
  }

  change(stateName: SceneName, enterParams: EnterContext) {
    if (!(stateName in this.scenes)) return;
    this.current.exit();
    this.current = this.scenes[stateName];
    this.current.enter(enterParams);
  }

  update(dt: number) {
    this.current.update(dt);
  }

  draw(ctx: CanvasRenderingContext2D) {
    this.current.draw(ctx);
  }
}
