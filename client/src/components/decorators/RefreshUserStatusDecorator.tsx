import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "../../store/useAuthStore";
import { useFetch } from "../../hooks/useFetch";

export default function RefreshUserStatusDecorator({
  children,
  fallback = null,
  blocking = false,
}: {
  children: React.ReactNode;
  blocking?: boolean;
  fallback?: ReactNode;
}) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const { trigger, state } = useFetch(status);

  useEffect(() => {
    if (user === null) return;

    trigger();
  }, [user]);

  if (blocking && (state === "idle" || state === "pending")) {
    return fallback;
  }

  if (blocking && state === "error") {
    throw new Error("Failed to refresh user status");
  }

  return children;
}
