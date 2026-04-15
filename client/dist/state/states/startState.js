import { gGameConfig } from "../../config/gameConfig.js";
import { AudioManager, gInputManager, gStateMachine, } from "../../dependencies.js";
export class StartState {
    highlighted = 0;
    options = 2;
    constructor() { }
    draw(ctx) {
        ctx.font = gGameConfig.font.family.primary.large;
        ctx.textAlign = "center";
        ctx.fillStyle = gGameConfig.font.color.primary;
        const quarter = gGameConfig.viewport.height / 4;
        ctx.fillText("BREAKOUT", gGameConfig.viewport.width / 2, quarter);
        ctx.font = gGameConfig.font.family.primary.medium;
        if (this.highlighted == 0) {
            ctx.fillStyle = gGameConfig.font.color.secondary;
            ctx.fillText("Start", gGameConfig.viewport.width / 2, quarter * 3);
            ctx.fillStyle = gGameConfig.font.color.primary;
            ctx.fillText("High Scores", gGameConfig.viewport.width / 2, quarter * 3 + 48);
        }
        else {
            ctx.fillText("Start", gGameConfig.viewport.width / 2, quarter * 3);
            ctx.fillStyle = gGameConfig.font.color.secondary;
            ctx.fillText("High Scores", gGameConfig.viewport.width / 2, quarter * 3 + 48);
        }
    }
    update(dt) {
        if (gInputManager.keyboard.wasPressed("ArrowDown")) {
            this.highlighted = (this.highlighted + 1) % this.options;
            AudioManager.play("select");
        }
        else if (gInputManager.keyboard.wasPressed("ArrowUp")) {
            this.highlighted =
                this.highlighted == 0 ? this.options - 1 : this.highlighted - 1;
            AudioManager.play("select");
        }
        if (gInputManager.keyboard.wasPressed("Enter")) {
            if (this.highlighted == 0) {
                AudioManager.play("confirm");
                gStateMachine.change("paddleSelect");
            }
            else {
                AudioManager.play("confirm");
                gStateMachine.change("highScore");
            }
        }
    }
    enter(enterParams) { }
    exit() { }
}
