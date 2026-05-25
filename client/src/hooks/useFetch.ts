import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type FetchState<Data, Err = Error> = {
  data: Data | null;
  error: Err | null;
  state: "loading" | "error" | "data" | "idle";
  loading: boolean;
};

export function useFetch<Data, Err = Error>(
  fetchFN: () => Promise<Data>,
  enabled: boolean = true,
) {
  const [fetchState, setFetchState] = useState<FetchState<Data, Err>>({
    loading: enabled,
    data: null,
    error: null,
    state: enabled ? "loading" : "idle",
  });

  const setData = (data: Data) => {
    setFetchState((prev) => ({
      ...prev,
      loading: false,
      state: "data",
      data,
      error: null,
    }));
  };

  const setIdle = () => {
    setFetchState((prev) => ({
      ...prev,
      loading: true,
      state: "idle",
      data: null,
      error: null,
    }));
  };

  const setError = (error: Err) => {
    setFetchState((prev) => ({
      ...prev,
      loading: false,
      state: "error",
      error,
    }));
  };

  const lastFetchId = useRef(0);

  const trigger = useCallback(async () => {
    const fetchId = ++lastFetchId.current;

    setFetchState((prev) => ({
      ...prev,
      loading: true,
      state: "loading",
      error: null,
    }));

    try {
      const result = await fetchFN();
      // Only update if this is still the most recent request
      if (fetchId === lastFetchId.current) {
        setFetchState((prev) => ({
          ...prev,
          loading: false,
          state: "data",
          data: result,
        }));
      }
    } catch (err) {
      if (fetchId === lastFetchId.current) {
        setFetchState((prev) => ({
          ...prev,
          loading: false,
          state: "error",
          error: err as Err,
        }));
      }
    }
  }, [fetchFN]);

  // Handle auto-triggering
  useEffect(() => {
    if (enabled) {
      trigger();
    }
    return () => {
      lastFetchId.current++;
    };
  }, [enabled, trigger]);

  return { ...fetchState, trigger, setData, setError, setIdle };
}
