import assert from "node:assert/strict";

import { createMockRemoteTransport } from "../src/game/authority/createMockRemoteTransport";
import {
  createLocalGameAuthority,
  createRemoteGameAuthority,
} from "../src/game/authority/gameAuthority";
import { mockGameContent } from "../src/game/content/mockGameContent";
import { createDefaultMatchSetup } from "../src/game/world/createInitialWorld";

{
  const authority = createLocalGameAuthority({
    mode: "localTwoPlayer",
    setup: createDefaultMatchSetup("localTwoPlayer"),
    content: mockGameContent,
    worldSize: { width: 960, height: 560 },
  });

  const before = authority.getViewState();
  assert.ok(before);
  assert.equal(before.match.activePlayerId, 0);
  assert.equal(before.tanks[0]?.selectedProjectileSlotId, "standard");

  assert.equal(
    authority.submitAction({
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );

  const after = authority.getViewState();
  assert.equal(after?.tanks[0]?.selectedProjectileSlotId, "mortar");
  authority.destroy();
}

{
  const authority = createLocalGameAuthority({
    mode: "localTwoPlayer",
    setup: createDefaultMatchSetup("localTwoPlayer"),
    content: mockGameContent,
    worldSize: { width: 960, height: 560 },
  });

  const view = authority.getViewState();
  assert.ok(view);
  assert.equal(view.terrain.kind, "heightmap");
  view.tanks[0]!.selectedProjectileSlotId = "heavy";
  view.terrain.surface[0] = -999;

  const nextView = authority.getViewState();
  assert.equal(nextView?.tanks[0]?.selectedProjectileSlotId, "standard");
  assert.notEqual(
    nextView?.terrain.kind === "heightmap" ? nextView.terrain.surface[0] : null,
    -999,
  );
  authority.destroy();
}

{
  const authority = createLocalGameAuthority({
    mode: "playerVsAi",
    setup: createDefaultMatchSetup("playerVsAi"),
    content: mockGameContent,
    worldSize: { width: 960, height: 560 },
  });

  assert.equal(
    authority.submitAction({
      type: "fire",
      angle: -0.6,
      power: 400,
      projectileSlotId: "standard",
    }),
    true,
  );

  for (
    let i = 0;
    i < 360 && authority.getViewState()?.match.activePlayerId !== 1;
    i += 1
  ) {
    authority.update(1 / 30);
  }

  assert.equal(authority.getViewState()?.match.activePlayerId, 1);
  assert.equal(authority.getViewState()?.match.phase, "thinking");
  assert.equal(authority.submitAction({ type: "move", direction: 1 }), true);
  authority.destroy();
}

{
  const transport = createMockRemoteTransport({
    setup: createDefaultMatchSetup("online"),
    content: mockGameContent,
    width: 960,
    height: 560,
    latencyMs: 0,
  });
  const authority = createRemoteGameAuthority({
    transport,
    localPlayerId: 0,
  });
  const seen: string[] = [];
  const unsubscribe = authority.subscribe((state) => {
    seen.push(state.tanks[0]?.selectedProjectileSlotId ?? "");
  });

  assert.equal(
    authority.submitAction({
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    false,
  );

  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(
    authority.submitAction({
      type: "selectProjectileSlot",
      projectileSlotId: "mortar",
    }),
    true,
  );
  await new Promise((resolve) => setTimeout(resolve, 5));

  unsubscribe();
  authority.destroy();
  assert.ok(seen.includes("mortar"));
}
