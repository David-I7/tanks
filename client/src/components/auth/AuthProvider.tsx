import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "../../store/useAuthStore";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const refresh = useAuthStore((state) => state.refresh);
  const initialized = useAuthStore((state) => state.initialized);

  useEffect(() => {
    if (initialized) return;
    (async () => {
      try {
        await refresh();
      } catch (error) {}
    })();
  }, []);

  return children;
}
