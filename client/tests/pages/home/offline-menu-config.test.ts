import assert from "node:assert/strict";

function parseOfflineGameConfig(searchParams: URLSearchParams) {
  const modeParam = searchParams.get("mode");
  const mode = modeParam === "playerVsAi" ? "playerVsAi" : "localTwoPlayer";

  const p1Name = searchParams.get("p1Name") || "Player 1";
  const p1Tank = searchParams.get("p1Tank") || "heavy-armor";

  const p2Name = searchParams.get("p2Name") || (mode === "playerVsAi" ? "AI Bot" : "Player 2");
  const p2Tank = searchParams.get("p2Tank") || (mode === "playerVsAi" ? "desert-striker" : "vanguard-cyber");

  return { mode, p1Name, p1Tank, p2Name, p2Tank };
}

async function testPlayerVsAiConfig() {
  const params = new URLSearchParams("mode=playerVsAi&p1Name=Ace&p1Tank=vanguard-cyber");
  const config = parseOfflineGameConfig(params);

  assert.equal(config.mode, "playerVsAi");
  assert.equal(config.p1Name, "Ace");
  assert.equal(config.p1Tank, "vanguard-cyber");
  assert.equal(config.p2Name, "AI Bot");
  assert.equal(config.p2Tank, "desert-striker");
  console.log("✓ testPlayerVsAiConfig passed");
}

async function testLocalTwoPlayerConfig() {
  const params = new URLSearchParams("mode=localTwoPlayer&p1Name=Alpha&p1Tank=heavy-armor&p2Name=Beta&p2Tank=desert-striker");
  const config = parseOfflineGameConfig(params);

  assert.equal(config.mode, "localTwoPlayer");
  assert.equal(config.p1Name, "Alpha");
  assert.equal(config.p1Tank, "heavy-armor");
  assert.equal(config.p2Name, "Beta");
  assert.equal(config.p2Tank, "desert-striker");
  console.log("✓ testLocalTwoPlayerConfig passed");
}

async function run() {
  await testPlayerVsAiConfig();
  await testLocalTwoPlayerConfig();
  console.log("All offline menu config tests passed!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
