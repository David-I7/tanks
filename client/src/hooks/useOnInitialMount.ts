import { useEffect, useRef } from "react";

export default function useOnInitialMount(callback: () => void) {
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      callback();
      hasMountedRef.current = true;
    }
  }, [callback]);
}
