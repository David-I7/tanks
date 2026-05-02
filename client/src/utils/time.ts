export async function wait(milis: number) {
  await new Promise((res) => {
    setTimeout(() => res(true), milis);
  });
}
