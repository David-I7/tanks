import { useCallback, useEffect, useRef, useState } from "react";

type FetchState<Data> = {
  data: Data | null;
  error: Error | null;
  state: "pending" | "error" | "success" | "idle";
  isLoading: boolean;
};

export function useFetch<Data, FetchFnArgs>(
  fetchFn: (...args: FetchFnArgs[]) => Promise<Data>,
) {
  const [fetchState, setFetchState] = useState<FetchState<Data>>({
    isLoading: false,
    data: null,
    error: null,
    state: "idle",
  });

  const lastFetchId = useRef(0);

  const trigger = useCallback(
    async (...args: FetchFnArgs[]) => {
      const fetchId = ++lastFetchId.current;

      setFetchState((prev) => {
        if (prev.isLoading) return prev;
        return {
          ...prev,
          isLoading: true,
          state: "pending",
          error: null,
        };
      });

      try {
        const result = await fetchFn(...args);
        // Only update if this is still the most recent request
        if (fetchId === lastFetchId.current) {
          setFetchState((_) => ({
            isLoading: false,
            state: "success",
            data: result,
            error: null,
          }));
        }
      } catch (err) {
        if (!(err instanceof Error)) {
          err = new Error("Failed to fetch resource. Please try again later");
        }
        if (fetchId === lastFetchId.current) {
          setFetchState((prev) => ({
            ...prev,
            isLoading: false,
            state: "error",
            error: err as Error,
          }));
        }
      }
    },
    [fetchFn],
  );

  useEffect(() => {
    return () => {
      lastFetchId.current++;
    };
  }, [trigger]);

  return { ...fetchState, trigger };
}
