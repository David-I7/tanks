export default class Random {
  static bool(): boolean {
    return this.int(0, 1) == 1;
  }
  static int(m: number, n: number) {
    return m + Math.floor(Math.random() * (n - m + 1));
  }
}
