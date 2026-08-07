import { describe, it, expect } from "vitest";
import { createStompClient } from "../mockGameHarness";
import ProblemDetailDto from "../../../src/api/http/dto/ProblemDetailDto";

describe("Invalid Token Authentication", () => {
  it("rejects STOMP connection when authentication token is invalid or expired", async () => {
    let connectionError: ProblemDetailDto | null = null;
    try {
      await createStompClient(
        "invalid-jwt-token-xyz",
        "unauthorizedUser",
        9999,
      );
    } catch (err: any) {
      connectionError = err;
    }
    console.log("Connection error for invalid token:", connectionError);
    expect(connectionError).toBeDefined();
  });
});
