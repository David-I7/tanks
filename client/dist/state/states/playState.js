import { AABBColides, AudioManager, gStateMachine, } from "../../dependencies.js";
import { gGameConfig } from "../../config/gameConfig.js";
import { randInt } from "../../utils/random.js";
import { drawStats } from "../../utils/game.js";
export class PlayState {
    levelState = null;
    enter(enterParams) {
        this.levelState = enterParams;
        this.levelState.ball.vx = randInt(-200, 200) * gGameConfig.viewport.scaler;
        this.levelState.ball.vy = randInt(-50, -80) * gGameConfig.viewport.scaler;
    }
    exit() { }
    draw(ctx) {
        this.levelState?.paddle.draw(ctx);
        this.levelState?.ball.draw(ctx);
        this.levelState?.bricks.forEach((brick) => {
            if (brick.inPlay || brick.particleSystem.particleStates.length)
                brick.draw(ctx);
        });
        drawStats(ctx, this.levelState.score, this.levelState.hearts);
    }
    update(dt) {
        const ls = this.levelState;
        const ball = ls.ball;
        const paddle = ls.paddle;
        paddle.update(dt);
        ball.update(dt);
        if (AABBColides(ball, paddle)) {
            if (ball.y >= paddle.y + paddle.height / 2) {
                ball.vx *= -1;
            }
            else {
                ball.y = paddle.y - ball.height;
                ball.vy *= -1;
                if (ball.x < paddle.x + paddle.width / 2 && paddle.vx < 0) {
                    ball.vx = -50 + -(6 * paddle.x + paddle.width / 2 - ball.x);
                }
                else if (ball.x > paddle.x + paddle.width / 2 && paddle.vx > 0) {
                    ball.vx = -50 + 6 * Math.abs(paddle.x + paddle.width / 2 - ball.x);
                }
            }
            AudioManager.play("paddle-hit");
        }
        ls.bricks.forEach((brick) => {
            brick.update(dt);
            if (brick.inPlay && AABBColides(ball, brick)) {
                ls.score = ls.score + ((brick.tier + 1) * 200 + (brick.color + 1) * 25);
                brick.hit();
                if (ls.score > ls.recoverPoints) {
                    ls.hearts = Math.min(ls.hearts + 1, 3);
                    ls.recoverPoints = Math.min(100000, ls.recoverPoints * 2);
                    AudioManager.play("recover");
                }
                if (this.checkVictory()) {
                    AudioManager.play("victory");
                    gStateMachine.change("victory", this.levelState);
                    return;
                }
                // brick collision
                if (ball.x + 2 < brick.x && ball.vx > 0) {
                    //left collision
                    ball.vx *= -1;
                    ball.x = brick.x - ball.width;
                }
                else if (ball.x + 6 > brick.x + brick.width && ball.vx < 0) {
                    // right collison
                    ball.vx *= -1;
                    ball.x = brick.x + brick.width;
                }
                else if (ball.y < brick.y) {
                    // top collision
                    ball.vy *= -1;
                    ball.y = brick.y - ball.height;
                }
                else {
                    // bottom collision
                    ball.vy *= -1;
                    ball.y = brick.y + brick.height;
                }
            }
        });
        if (ball.y + ball.height >= gGameConfig.viewport.height) {
            AudioManager.play("hurt");
            --ls.hearts;
            if (ls.hearts <= 0) {
                gStateMachine.change("gameOver", ls);
                return;
            }
            else {
                gStateMachine.change("serve", this.levelState);
            }
        }
    }
    checkVictory() {
        for (let i = 0; i < this.levelState.bricks.length; ++i) {
            if (this.levelState.bricks[i].inPlay)
                return false;
        }
        return true;
    }
}
