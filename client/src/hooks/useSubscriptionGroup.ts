import { useCallback, useRef } from "react";
import type { SubscriptionCleanup } from "../api/ws/WebSocketClient";

export function useSubscriptionGroup() {
  const subscriptions = useRef<SubscriptionCleanup[]>([]);

  const add = useCallback((cleanup: SubscriptionCleanup) => {
    subscriptions.current.push(cleanup);
  }, []);

  const cleanup = useCallback(() => {
    subscriptions.current.forEach((c) => c());
    subscriptions.current = [];
  }, []);

  return { add, cleanup };
}
