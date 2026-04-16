export default class Random {
    static bool() {
        return this.int(0, 1) == 1;
    }
    static int(m, n) {
        return m + Math.floor(Math.random() * (n - m + 1));
    }
}
