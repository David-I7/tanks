import { useRef } from "react";
import type { SubscriptionCleanup } from "../api/ws/TanksWebSocketClient";

export function useSubscriptionGroup() {
  const subscriptions = useRef<SubscriptionCleanup[]>([]);

  function add(cleanup: SubscriptionCleanup) {
    subscriptions.current.push(cleanup);
  }

  function cleanup() {
    subscriptions.current.forEach((c) => c());
    subscriptions.current = [];
  }

  return { add, cleanup };
}
