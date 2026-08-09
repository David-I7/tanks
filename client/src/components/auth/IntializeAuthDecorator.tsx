import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "../../store/useAuthStore";

export default function InitializeAuthDecorator({
  children,
}: {
  children: ReactNode;
}) {
  const refresh = useAuthStore((state) => state.refresh);

  useEffect(() => {
    if (useAuthStore.getState().initialized) return;
    (async () => {
      try {
        await refresh();
      } catch (error) {}
    })();
  }, []);

  return children;
}
