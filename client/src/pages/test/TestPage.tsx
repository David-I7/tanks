import React, { useEffect, useRef, useState } from "react";
import GoogleLoginRequest from "../../api/http/requests/GoogleLoginRequest";
import Button from "../../components/buttons/Button";
import type OAuth2LoginResponseDto from "../../api/http/dto/OAuth2LoginResponseDto";

const ORIGIN = import.meta.env.VITE_BASE_API_URL.concat(
  new GoogleLoginRequest().getPath(),
);

export default function TestPage() {
  const popup = useRef<WindowProxy>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handlePopupOpen = () => {
    const URL = "https://example.com";
    popup.current = window.open(URL, "", "");
    setIsOpen(true);
  };

  const pollPopupClose = (popup: WindowProxy, onPopupClose: () => void) => {
    const intervalId = setInterval(() => {
      if (popup.closed) {
        onPopupClose();
        clearInterval(intervalId);
      }
    }, 500);

    return () => clearInterval(intervalId);
  };

  useEffect(() => {
    if (!isOpen || !popup.current) return;

    const abortController = new AbortController();
    const cleanupPopupPoll = pollPopupClose(popup.current, () => {
      popup.current = null;
      setIsOpen(false);
    });

    const origin = "https://example.com";

    window.addEventListener(
      "message",
      (e) => {
        if (!(origin === e.origin)) return;

        cleanupPopupPoll();
        popup.current?.close();
        popup.current = null;

        const response: OAuth2LoginResponseDto = e.data;

        if (response.type === "OAUTH2_SUCCESS") {
          // register user
        } else if (response.type === "OAUTH2_PARTIAL") {
          setIsOpen(false);
        } else {
        }
      },
      { signal: abortController.signal },
    );

    return () => {
      cleanupPopupPoll();
      abortController.abort();
    };
  }, [isOpen]);

  return (
    <div>
      <Button disabled={isOpen} onClick={handlePopupOpen} color="primary">
        Open popup
      </Button>
    </div>
  );
}
