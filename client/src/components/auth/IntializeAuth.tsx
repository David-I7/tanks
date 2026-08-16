import { useEffect } from "react";
import { useAuthStore } from "../../store/useAuthStore";

export default function InitializeAuth() {
  const refresh = useAuthStore((state) => state.refresh);

  useEffect(() => {
    if (useAuthStore.getState().initialized) return;
    (async () => {
      try {
        await refresh();
      } catch (error) {}
    })();
  }, []);

  return null;
}
