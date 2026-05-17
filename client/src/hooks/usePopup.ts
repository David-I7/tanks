import { useEffect, useRef, useState } from "react";

type usePopupProps = {
  url?: string | URL;
  target?: string;
  features?: string;
  onMessageReceived: (message: any) => void;
  onPopupClose?: () => void;
};

const ORIGIN: string = import.meta.env.VITE_SERVER_ORIGIN;

export const usePopup = ({
  url,
  target,
  features,
  onMessageReceived,
  onPopupClose,
}: usePopupProps) => {
  const popup = useRef<WindowProxy>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const openPopup = () => {
    popup.current = window.open(url, target, features);
    setIsOpen(true);
  };

  const closePopup = () => {
    setIsOpen(false);
    onPopupClose?.();
    popup.current?.close();
    popup.current = null;
  };

  const pollPopupClose = (popup: WindowProxy) => {
    const intervalId = setInterval(() => {
      if (popup.closed) {
        closePopup();
        clearInterval(intervalId);
      }
    }, 500);

    return () => clearInterval(intervalId);
  };

  useEffect(() => {
    if (!isOpen || !popup.current) return;

    const abortController = new AbortController();
    const clearPopupPoll = pollPopupClose(popup.current);

    window.addEventListener(
      "message",
      (e) => {
        if (!(ORIGIN === e.origin)) return;

        onMessageReceived(e.data);
      },
      { signal: abortController.signal },
    );

    return () => {
      clearPopupPoll();
      abortController.abort();
    };
  }, [isOpen]);

  return { closePopup, openPopup, isOpen };
};
