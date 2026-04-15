import { gGameConfig } from "../../config/gameConfig.js";
import { AudioManager, gInputManager, gStateMachine, } from "../../dependencies.js";
import { HighScoreManger } from "../../highScoreManger.js";
export class SetHighScore {
    levelState = null;
    name = [65, 65, 65];
    highlighted = 0;
    update(dt) {
        if (gInputManager.keyboard.wasPressed("Enter")) {
            HighScoreManger.set({
                name: String.fromCharCode(...this.name),
                score: this.levelState.score.toString(),
            }, this.levelState.highScoreIndex);
            AudioManager.play("confirm");
            gStateMachine.change("highScore");
            return;
        }
        else if (gInputManager.keyboard.wasPressed("ArrowUp")) {
            if (this.name[this.highlighted] === 65) {
                this.name[this.highlighted] = 90;
            }
            else {
                --this.name[this.highlighted];
            }
            AudioManager.play("select");
        }
        else if (gInputManager.keyboard.wasPressed("ArrowDown")) {
            if (this.name[this.highlighted] === 90) {
                this.name[this.highlighted] = 65;
            }
            else {
                ++this.name[this.highlighted];
            }
            AudioManager.play("select");
        }
        else if (gInputManager.keyboard.wasPressed("ArrowLeft")) {
            if (this.highlighted === 0) {
                this.highlighted = 2;
            }
            else {
                --this.highlighted;
            }
            AudioManager.play("select");
        }
        else if (gInputManager.keyboard.wasPressed("ArrowRight")) {
            if (this.highlighted === 2) {
                this.highlighted = 0;
            }
            else {
                ++this.highlighted;
            }
            AudioManager.play("select");
        }
    }
    draw(ctx) {
        ctx.font = gGameConfig.font.family.primary.medium;
        ctx.fillStyle = gGameConfig.font.color.primary;
        ctx.textAlign = "center";
        ctx.fillText(`Your Score: ${this.levelState.score}`, gGameConfig.viewport.width / 2, 64);
        ctx.font = gGameConfig.font.family.primary.large;
        ctx.textAlign = "left";
        this.name.forEach((num, i) => {
            const char = String.fromCharCode(num);
            ctx.fillStyle =
                this.highlighted === i
                    ? gGameConfig.font.color.secondary
                    : (ctx.fillStyle = gGameConfig.font.color.primary);
            ctx.fillText(`${char}`, gGameConfig.viewport.width / 2 - 100 + 75 * i, gGameConfig.viewport.height / 2);
        });
        ctx.font = gGameConfig.font.family.primary.medium;
        ctx.fillStyle = gGameConfig.font.color.primary;
        ctx.textAlign = "center";
        ctx.fillText(`Enter a name!`, gGameConfig.viewport.width / 2, gGameConfig.viewport.height / 2 - 128);
        ctx.font = gGameConfig.font.family.primary.small;
        ctx.fillStyle = gGameConfig.font.color.primary;
        ctx.textAlign = "center";
        ctx.fillText(`(Press Enter to Confirm!)`, gGameConfig.viewport.width / 2, gGameConfig.viewport.height - 64);
    }
    enter(enterParams) {
        this.levelState = enterParams;
    }
    exit() { }
}
