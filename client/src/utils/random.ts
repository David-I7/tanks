export function randInt(m: number, n: number) {
  return m + Math.floor(Math.random() * (n - m + 1));
}
export function randBool(): boolean {
  return randInt(0, 1) == 1;
}
