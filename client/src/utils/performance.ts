export function debounce<T extends unknown[]>(
  cb: (...args: T) => void,
  delayMS: number,
) {
  let timeoutId: number | null = null;

  return {
    fn: (...args: T) => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        cb(...args);
      }, delayMS);
    },
    cancel: () => {
      if (timeoutId !== null) clearTimeout(timeoutId);
      timeoutId = null;
    },
  };
}

export function throttle<T>(cb: (...args: T[]) => void, delayMS: number) {
  let timeoutId: number | null = null;
  let waitingArgs: T[] | null = null;
  let shouldWait = false;

  return {
    fn: (...args: T[]) => {
      waitingArgs = args;

      if (!shouldWait) {
        cb(...waitingArgs);
        shouldWait = true;
        timeoutId = setTimeout(() => {
          shouldWait = false;
          timeoutId = null;
        }, delayMS);
      }
    },
    cancel: () => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
      shouldWait = false;
      timeoutId = null;
      waitingArgs = null;
    },
  };
}
