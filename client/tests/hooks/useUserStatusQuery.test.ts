import assert from "node:assert/strict";
import { QueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../src/store/useAuthStore";
import type { UserSessionStatus } from "../../src/api/http/dto/AuthStatusResponseDto";

async function testUserStatusQueryCacheSeam() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
      },
    },
  });

  const testUser = { id: "user-123", username: "TestPlayer", email: "test@example.com" };
  useAuthStore.setState({ user: testUser });

  const mockStatus: UserSessionStatus = { state: "IN_GAME", gameId: "game-abc-123" };
  queryClient.setQueryData(["userStatus", testUser.id], mockStatus);

  const cachedStatus = queryClient.getQueryData<UserSessionStatus>(["userStatus", testUser.id]);
  assert.deepEqual(cachedStatus, mockStatus);
  assert.equal(cachedStatus?.state, "IN_GAME");

  queryClient.clear();
  assert.equal(queryClient.getQueryData(["userStatus", testUser.id]), undefined);
  console.log("✓ testUserStatusQueryCacheSeam passed");
}

async function run() {
  await testUserStatusQueryCacheSeam();
  console.log("All TanStack Query seam tests passed!");
}

run().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
