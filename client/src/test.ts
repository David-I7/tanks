import { MouseGestures, MouseInput } from "./input/MouseInput.js";
import { KeyboardGestures, KeyboardInput } from "./input/KeyboardInput.js";

window.addEventListener("DOMContentLoaded", async () => {
  const canvas = document.getElementById("canvas1") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d")!;
  const CANVAS_WIDTH = (canvas.width = window.innerWidth);
  const CANVAS_HEIGHT = (canvas.height = window.innerHeight);

  const mouseInput = new MouseInput(canvas);
  const mouseGestures = new MouseGestures(mouseInput);

  const keyboardInput = new KeyboardInput();
  const keyboardGestures = new KeyboardGestures(keyboardInput);

  let lastTime: number = 0;
  function animate(timestamp: number) {
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    mouseInput.update();
    mouseGestures.update();
    keyboardInput.update();
    keyboardGestures.update();

    // DRAG TEST

    if (mouseGestures.hasDragStarted()) {
      console.log(`DragStart: ${JSON.stringify(mouseGestures.getDragStart())}`);
    }
    if (mouseGestures.hasDragMoved()) {
      console.log(`DragMove: ${JSON.stringify(mouseGestures.getDragMoves())}`);
    }
    if (mouseGestures.hasDragEnded()) {
      console.log(`DragEnd: ${JSON.stringify(mouseGestures.getDragEnd())}`);
    }

    // CLICK TEST
    if (mouseGestures.wasClicked()) {
      console.log(`Clicked: ${JSON.stringify(mouseGestures.getClick())}`);
    }
    if (mouseGestures.wasPressed()) {
      console.log(`Pressed: ${JSON.stringify(mouseGestures.getMousePress())}`);
    }
    if (mouseGestures.wasReleased()) {
      console.log(
        `Released: ${JSON.stringify(mouseGestures.getMouseRelease())}`,
      );
    }
    if (mouseGestures.wasDoubleClicked()) {
      console.log(
        `Double CLick: ${JSON.stringify(mouseGestures.getDoubleClick())}`,
      );
    }

    // Mouse events
    if (mouseGestures.hasMouseMoved()) {
      console.log(
        `Mouse moved: ${JSON.stringify(mouseGestures.getMouseMoves())}`,
      );
    }
    if (mouseGestures.hasMouseLeft()) {
      console.log(
        `Mouse left: ${JSON.stringify(mouseGestures.getMouseLeaves())}`,
      );
    }

    // Keyboard
    if (keyboardGestures.wasPressed("e")) {
      console.log("e was pressed");
    }
    if (keyboardGestures.isHeld("e")) {
      console.log("e is down");
    }
    if (keyboardGestures.wasReleased("e")) {
      console.log("e was released");
    }
    if (keyboardGestures.wasTyped("e")) {
      console.log("e was typed");
    }
    if (keyboardGestures.getPressedKeys().length) {
      console.log(
        `Keys pressed: ${JSON.stringify(keyboardGestures.getPressedKeys())}`,
      );
    }
    if (keyboardGestures.getTypedKeys().length) {
      console.log(
        `Keys typed: ${JSON.stringify(keyboardGestures.getTypedKeys())}`,
      );
    }
    if (keyboardGestures.getReleasedKeys().length) {
      console.log(
        `Keys released: ${JSON.stringify(keyboardGestures.getReleasedKeys())}`,
      );
    }
    if (keyboardGestures.getKeysHeld().size) {
      console.log(
        `Keys held: ${JSON.stringify([...keyboardGestures.getKeysHeld()])}`,
      );
    }

    requestAnimationFrame(animate);
  }
  animate(lastTime);
});
