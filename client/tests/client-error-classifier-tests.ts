import assert from "node:assert/strict";
import { ApiError } from "../src/errors/ApiError";
import { AuthenticationError } from "../src/errors/AuthenticationError";
import { classifyClientError } from "../src/errors/classifyClientError";
import InvalidStateError from "../src/errors/InvalidStateError";
import { JSONError } from "../src/errors/JSONError";
import NetworkError from "../src/errors/NetworkError";
import { ValidationError } from "../src/errors/ValidationError";
import WebSocketError from "../src/errors/WebSocketError";

{
  const descriptor = classifyClientError(
    new ApiError(
      {
        title: "Lobby unavailable",
        status: 503,
        type: "about:blank",
        instance: "/lobby/abc",
        detail: "The lobby service is temporarily offline.",
      },
      503,
    ),
  );

  assert.equal(descriptor.category, "api");
  assert.equal(descriptor.title, "Lobby unavailable");
  assert.equal(descriptor.message, "The lobby service is temporarily offline.");
  assert.equal(descriptor.diagnostics.status, 503);
  assert.equal(descriptor.recoveryActions[0]?.kind, "reload");
}

{
  const descriptor = classifyClientError(
    new ApiError(
      {
        title: "Unauthorized",
        status: 401,
        type: "about:blank",
        instance: "/auth/status",
        detail: "Your session has expired.",
      },
      401,
    ),
  );

  assert.equal(descriptor.category, "authentication");
  assert.equal(descriptor.title, "Unauthorized");
  assert.equal(descriptor.message, "Your session has expired.");
  assert.deepEqual(
    descriptor.recoveryActions.map((action) => action.kind),
    ["login", "home"],
  );
}

{
  const cases: Array<[unknown, string, string]> = [
    [new AuthenticationError("Please sign in again.", 401), "authentication", "login"],
    [new ValidationError("Display name is required."), "validation", "back"],
    [new NetworkError("Could not reach the server."), "network", "retry"],
    [
      new WebSocketError({
        title: "Lobby socket closed",
        status: 1006,
        type: "about:blank",
        instance: "/lobby/abc",
        detail: "Realtime updates disconnected.",
      }),
      "websocket",
      "retry",
    ],
    [new InvalidStateError("Missing selected tank."), "invalid-state", "reload"],
    [new JSONError("Unexpected token < in JSON."), "json", "reload"],
  ];

  for (const [error, category, recoveryAction] of cases) {
    const descriptor = classifyClientError(error);
    assert.equal(descriptor.category, category);
    assert.equal(descriptor.recoveryActions[0]?.kind, recoveryAction);
    assert.ok(descriptor.message.length > 0);
  }
}

{
  const descriptor = classifyClientError({
    status: 404,
    statusText: "Not Found",
    internal: true,
    data: { message: "No route matches URL /missing" },
  });

  assert.equal(descriptor.category, "not-found");
  assert.equal(descriptor.title, "Page not found");
  assert.equal(descriptor.message, "The page you are looking for does not exist.");
  assert.deepEqual(
    descriptor.recoveryActions.map((action) => action.kind),
    ["home", "back"],
  );
}

{
  const runtime = classifyClientError(new Error("Render failed."));
  assert.equal(runtime.category, "runtime");
  assert.equal(runtime.title, "Something went wrong");
  assert.deepEqual(
    runtime.recoveryActions.map((action) => action.kind),
    ["reload", "home"],
  );

  const stringValue = classifyClientError("plain thrown string");
  assert.equal(stringValue.category, "unknown");
  assert.equal(stringValue.message, "plain thrown string");

  const objectValue = classifyClientError({ reason: "plain object" });
  assert.equal(objectValue.category, "unknown");
  assert.equal(objectValue.message, '{"reason":"plain object"}');

  const nullValue = classifyClientError(null);
  assert.equal(nullValue.category, "unknown");
  assert.equal(nullValue.diagnostics.valueType, "null");
}
