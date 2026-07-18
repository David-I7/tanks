import { useCallback, useEffect, useRef, useState } from "react";

type FetchState<Data> =
  | {
      data: null;
      error: null;
      state: "idle";
      isLoading: false;
      isFetching: false;
    }
  | {
      data: null;
      error: null;
      state: "pending";
      isLoading: true;
      isFetching: true;
    }
  | {
      data: Data;
      error: null;
      state: "pending";
      isLoading: false;
      isFetching: true;
    }
  | {
      data: Data;
      error: Error;
      state: "error";
      isLoading: false;
      isFetching: false;
    }
  | {
      data: null;
      error: Error;
      state: "error";
      isLoading: false;
      isFetching: false;
    }
  | {
      data: Data;
      error: null;
      state: "success";
      isLoading: false;
      isFetching: false;
    };

export function useFetch<Data, FetchFnArgs>(
  fetchFn: (...args: FetchFnArgs[]) => Promise<Data>,
) {
  const [fetchState, setFetchState] = useState<FetchState<Data>>({
    isLoading: false,
    data: null,
    error: null,
    state: "idle",
    isFetching: false,
  });

  const lastFetchId = useRef(0);

  const trigger = useCallback(
    async (...args: FetchFnArgs[]) => {
      const fetchId = ++lastFetchId.current;

      setFetchState((prev) => {
        if (prev.isFetching) return prev;

        return {
          ...prev,
          state: "pending",
          error: null,
          isFetching: true,
          isLoading: prev.state === "idle",
        } as FetchState<Data>;
      });

      try {
        const result = await fetchFn(...args);
        // Only update if this is still the most recent request
        if (fetchId === lastFetchId.current) {
          setFetchState((_) => ({
            isLoading: false,
            isFetching: false,
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
            isFetching: false,
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
