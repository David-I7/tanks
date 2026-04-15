export function randInt(m, n) {
    return m + Math.floor(Math.random() * (n - m + 1));
}
export function randBool() {
    return randInt(0, 1) == 1;
}
