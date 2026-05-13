import React, { useEffect, useRef, useState } from "react";
import Button from "../../components/buttons/Button";
import GoogleLoginRequest from "../../api/http/requests/GoogleLoginRequest";

export default function TestPage() {
  const popup = useRef<WindowProxy>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const handlePopupOpen = () => {
    const googleLoginRequest = new GoogleLoginRequest();
    const URL = import.meta.env.VITE_BASE_API_URL.concat(
      googleLoginRequest.getPath(),
    );
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
        console.log("hello");
        if (!(origin === e.origin)) return;
        //if (!(e.data?.source === "graph calculator")) return;
        console.log(e);

        cleanupPopupPoll();
        //if(popup.current?.origin)
        popup.current?.close();
        popup.current = null;
        if (e.data.type === "oauth_success") {
          // register user
        } else {
          setIsOpen(false);
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
