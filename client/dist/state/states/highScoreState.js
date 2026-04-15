import { AudioManager, gGameConfig, gInputManager, gStateMachine, } from "../../dependencies.js";
import { HighScoreManger } from "../../highScoreManger.js";
export class HighScoreState {
    highScores = [];
    maxScoreLength = 0;
    update(dt) {
        if (gInputManager.keyboard.wasPressed("Escape")) {
            AudioManager.play("wall-hit");
            gStateMachine.change("start");
        }
    }
    draw(ctx) {
        ctx.font = gGameConfig.font.family.primary.large;
        ctx.fillStyle = gGameConfig.font.color.primary;
        ctx.textAlign = "center";
        const quarter = gGameConfig.viewport.height / 4;
        ctx.fillText("High Scores", gGameConfig.viewport.width / 2, quarter);
        ctx.font = gGameConfig.font.family.primary.medium;
        const x = gGameConfig.viewport.width / 2;
        const y = quarter + 128;
        this.highScores.forEach((highScore, i) => {
            ctx.fillText(`${(i + 1)
                .toString()
                .padStart(this.highScores.length == 10 ? 2 : 1)}.       ${highScore.name}       ${highScore.score.padStart(this.maxScoreLength)}`, x, y + i * 32);
        });
        ctx.font = gGameConfig.font.family.primary.small;
        ctx.fillText("Press Escape to return to main menu", x, y + this.highScores.length * 32 + 48);
    }
    enter(enterParams) {
        this.highScores = HighScoreManger.get();
        this.maxScoreLength = this.highScores.reduce((prev, cur) => Math.max(cur.score.length, prev), 0);
    }
    exit() { }
}
