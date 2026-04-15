export function displayFps(unit = "sec", opt = {}) {
    let timer = 0;
    let cnt = 0;
    const interval = unit == "sec" ? 1 : 1000;
    let prevCnt = 0;
    return (dt, ctx) => {
        timer += dt;
        cnt++;
        if (timer >= interval) {
            timer = interval - timer;
            prevCnt = cnt;
            cnt = 0;
        }
        ctx.save();
        ctx.font = opt.font || "16px Helvetica";
        ctx.textAlign = "start";
        ctx.fillStyle = opt.fillStyle || "black";
        ctx.fillText(`FPS: ${prevCnt}`, opt.x || 24, opt.y || 24);
        ctx.restore();
    };
}
// export function AABBColides(a: Drawable, b: Drawable): boolean {
//   return (
//     a.x < b.x + b.width &&
//     a.x + a.width > b.x &&
//     a.y < b.y + b.height &&
//     a.y + a.height > b.y
//   );
// }
