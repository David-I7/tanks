import "./style.css";
import "@fontsource/inter/400.css";
import "@fontsource/poppins/400.css";
import Login from "./components/auth/Login";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
        <main class="min-h-screen bg-red-600 grid items-center">
          ${Login()}
        </main>
`;

import { Client } from "@stomp/stompjs";

(async () => {
  async function authenticateGuestUser() {
    fetch("http://localhost:8080/api/v1/auth/guest", {
      method: "post",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ username: "james" }),
    }).then(async (res) => {
      if (!res.ok) {
        console.error(res.status);
      } else {
        if (res.headers.get("content-type") === "application/json") {
          sessionStorage.setItem(
            "accessToken",
            ((await res.json()) as { accessToken: string }).accessToken,
          );
        }
      }
    });
  }

  if (sessionStorage.getItem("accessToken") === null) {
    await authenticateGuestUser();
  }

  const client = new Client({
    brokerURL: "ws://localhost:8080/ws",

    connectHeaders: {
      Authorization: `Bearer ${sessionStorage.getItem("accessToken")!}`,
    },

    onConnect: () => {
      console.log("Connected");
    },

    onStompError: async (frame) => {
      const message = frame.headers["message"] || "";

      // if (message.startsWith("AUTH_ERROR")) {
      //   console.warn("Authentication error detected");

      //   client.deactivate();

      //   await authenticateGuestUser();

      //   client.activate();
      // } else
      {
        console.error("STOMP error:", message);
        console.error("Details:", frame.body);
      }
    },

    onWebSocketClose: () => {
      console.warn("Connection closed");
    },
  });

  client.activate();
})();
