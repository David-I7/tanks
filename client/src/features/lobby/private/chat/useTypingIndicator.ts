import { useEffect, useMemo } from "react";
import { debounce, throttle } from "@/utils/performance";

const DEBOUNCE_TYPING_TIMEOUT = 1000;
const THROTTLE_TYPING_EVENT = 500;

type UseTypingIndicatorOptions = {
  isConnected: boolean;
  lobbyId: string | null;
  onSendTyping: (lobbyId: string) => void;
  onClearTyping: () => void;
};

export function useTypingIndicator({
  isConnected,
  lobbyId,
  onSendTyping,
  onClearTyping,
}: UseTypingIndicatorOptions) {
  const throttledSend = useMemo(
    () =>
      throttle(() => {
        if (!isConnected || !lobbyId) return;
        onSendTyping(lobbyId);
      }, THROTTLE_TYPING_EVENT),
    [isConnected, lobbyId, onSendTyping],
  );

  const debouncedClear = useMemo(
    () => debounce(onClearTyping, DEBOUNCE_TYPING_TIMEOUT),
    [onClearTyping],
  );

  useEffect(() => {
    return () => {
      throttledSend.cancel();
      debouncedClear.cancel();
    };
  }, [throttledSend, debouncedClear]);

  return {
    publishTypingEvent: throttledSend.fn,
    scheduleClearTyping: debouncedClear.fn,
    cancelClearTyping: debouncedClear.cancel,
  };
}
