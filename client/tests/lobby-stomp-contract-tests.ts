import assert from "node:assert/strict";
import TanksWSClient, { type PublishParams } from "../src/api/ws/TanksWebSocketClient";

async function testStompBodyFormatting() {
  const published: any[] = [];
  const client = new TanksWSClient("test-token", async () => ({ accessToken: "test", refreshToken: "test" }));

  // Override publish to capture params for test inspection
  (client as any).client = {
    publish: (params: any) => {
      published.push(params);
    },
    active: true,
  };

  client.publish({
    destination: "/app/lobby/create/private",
    body: { tankId: "vanguard-cyber" },
  });

  assert.equal(published.length, 1);
  assert.equal(published[0].destination, "/app/lobby/create/private");
  assert.equal(published[0].headers["content-type"], "application/json");
  assert.equal(published[0].body, JSON.stringify({ tankId: "vanguard-cyber" }));

  client.publish({
    destination: "/app/lobby/join/private/:id",
    id: "room-123",
    body: { tankId: "desert-striker" },
  });

  assert.equal(published.length, 2);
  assert.equal(published[1].destination, "/app/lobby/join/private/room-123");
  assert.equal(published[1].body, JSON.stringify({ tankId: "desert-striker" }));

  client.publish({
    destination: "/app/lobby/quick-match",
    body: { tankId: "heavy-armor" },
  });

  assert.equal(published.length, 3);
  assert.equal(published[2].destination, "/app/lobby/quick-match");
  assert.equal(published[2].body, JSON.stringify({ tankId: "heavy-armor" }));

  console.log("✓ testStompBodyFormatting passed");
}

testStompBodyFormatting().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
