import Drawable from "../interfaces/drawable.js";

export function displayFps(
  unit: "ms" | "sec" = "sec",
  opt: {
    fillStyle?: string;
    font?: string;
    x?: number;
    y?: number;
  } = {},
) {
  let timer = 0;
  let cnt = 0;
  const interval = unit == "sec" ? 1 : 1000;
  let prevCnt = 0;

  return (dt: number, ctx: CanvasRenderingContext2D) => {
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
