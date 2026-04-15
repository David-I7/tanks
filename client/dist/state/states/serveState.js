import { gInputManager, gStateMachine } from "../../dependencies.js";
import { Ball } from "../../entities/ball.js";
import { ResourceManager } from "../../resourceManager.js";
import { drawStats } from "../../utils/game.js";
import { randInt } from "../../utils/random.js";
export class ServerState {
    levelState = null;
    update(dt) {
        const ls = this.levelState;
        ls.paddle.update(dt);
        ls.ball.x = ls.paddle.x + ls.paddle.width / 2 - ls.ball.width / 2;
        ls.ball.y = ls.paddle.y - ls.ball.height;
        if (gInputManager.keyboard.wasPressed("Enter")) {
            gStateMachine.change("play", this.levelState);
        }
    }
    draw(ctx) {
        this.levelState?.paddle.draw(ctx);
        this.levelState?.ball.draw(ctx);
        this.levelState?.bricks.forEach((brick) => {
            if (brick.inPlay)
                brick.draw(ctx);
        });
        drawStats(ctx, this.levelState.score, this.levelState.hearts);
        for (let i = 0; i < this.levelState.hearts; i++) { }
    }
    enter(enterParams) {
        this.levelState = enterParams;
        const balls = ResourceManager.frames.balls;
        const sprite = balls[randInt(0, balls.length - 1)];
        this.levelState.ball = new Ball(sprite);
    }
    exit() { }
}
