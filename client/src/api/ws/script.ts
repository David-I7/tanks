import { Client } from "@stomp/stompjs";

const client = new Client({
  brokerURL: "ws://localhost:8080/ws",
  onConnect: () => {
    client.subscribe("/topic/test01", (message) =>
      console.log(`Received: ${message.body}`),
    );
    client.publish({ destination: "/topic/test01", body: "First Message" });
  },
});

client.activate();

(async () => {
  // if (sessionStorage.getItem("accessToken") === null) {
  //   await authenticateGuestUser();
  // }
  // const client = new Client({
  //   brokerURL: "ws://localhost:8080/ws",
  //   connectHeaders: {
  //     Authorization: `Bearer ${sessionStorage.getItem("accessToken")!}`,
  //   },
  //   onConnect: () => {
  //     console.log("Connected");
  //   },
  //   onStompError: async (frame) => {
  //     const message = frame.headers["message"] || "";
  //     // if (message.startsWith("AUTH_ERROR")) {
  //     //   console.warn("Authentication error detected");
  //     //   client.deactivate();
  //     //   await authenticateGuestUser();
  //     //   client.activate();
  //     // } else
  //     {
  //       console.error("STOMP error:", message);
  //       console.error("Details:", frame.body);
  //     }
  //   },
  //   onWebSocketClose: () => {
  //     console.warn("Connection closed");
  //   },
  // });
  // client.activate();
})();
