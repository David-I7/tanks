import { gGameConfig } from "../../config/gameConfig.js";
import { AudioManager, gInputManager, gStateMachine, } from "../../dependencies.js";
import { HighScoreManger } from "../../highScoreManger.js";
export class GameOverState {
    levelState = null;
    update(dt) {
        if (gInputManager.keyboard.wasPressed("Enter")) {
            let isHighScore = false;
            let highScoreIndex = 10;
            const highScores = HighScoreManger.get();
            for (let i = 0; i < highScores.length; ++i) {
                if (Number(highScores[i].score) < this.levelState.score) {
                    isHighScore = true;
                    highScoreIndex = i;
                    break;
                }
            }
            if (isHighScore) {
                AudioManager.play("high-score");
                gStateMachine.change("setHighScore", {
                    ...this.levelState,
                    highScoreIndex,
                });
                return;
            }
            else {
                AudioManager.play("confirm");
                gStateMachine.change("start");
            }
        }
    }
    draw(ctx) {
        ctx.font = gGameConfig.font.family.primary.large;
        ctx.fillStyle = gGameConfig.font.color.primary;
        ctx.textAlign = "center";
        ctx.fillText(`GAME OVER`, gGameConfig.viewport.width / 2, gGameConfig.viewport.height / 3);
        ctx.font = gGameConfig.font.family.primary.medium;
        ctx.fillText(`Final Score: ${this.levelState.score}`, gGameConfig.viewport.width / 2, (gGameConfig.viewport.height / 4) * 2);
        ctx.font = gGameConfig.font.family.primary.small;
        ctx.fillText(`(Press Enter to continue!)`, gGameConfig.viewport.width / 2, gGameConfig.viewport.height - 64);
    }
    enter(enterParams) {
        this.levelState = enterParams;
    }
    exit() { }
}
