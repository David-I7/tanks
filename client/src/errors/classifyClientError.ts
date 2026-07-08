import { isRouteErrorResponse } from "react-router-dom";
import { ApiError } from "./ApiError";
import { AuthenticationError } from "./AuthenticationError";
import InvalidStateError from "./InvalidStateError";
import { JSONError } from "./JSONError";
import NetworkError from "./NetworkError";
import { ValidationError } from "./ValidationError";
import WebSocketError from "./WebSocketError";

export type ClientErrorCategory =
  | "api"
  | "authentication"
  | "validation"
  | "network"
  | "websocket"
  | "invalid-state"
  | "json"
  | "not-found"
  | "route"
  | "runtime"
  | "unknown";

export type RecoveryActionKind = "home" | "login" | "reload" | "retry" | "back";

export type RecoveryActionDescriptor = {
  kind: RecoveryActionKind;
  label: string;
};

export type ClientErrorDiagnostics = {
  category: ClientErrorCategory;
  status?: number;
  statusText?: string;
  name?: string;
  message?: string;
  stack?: string;
  valueType: string;
};

export type ClientErrorDescriptor = {
  category: ClientErrorCategory;
  title: string;
  message: string;
  diagnostics: ClientErrorDiagnostics;
  recoveryActions: RecoveryActionDescriptor[];
};

const HOME: RecoveryActionDescriptor = { kind: "home", label: "Go home" };
const LOGIN: RecoveryActionDescriptor = { kind: "login", label: "Sign in" };
const RELOAD: RecoveryActionDescriptor = { kind: "reload", label: "Reload page" };
const RETRY: RecoveryActionDescriptor = { kind: "retry", label: "Try again" };
const BACK: RecoveryActionDescriptor = { kind: "back", label: "Go back" };

export function classifyClientError(error: unknown): ClientErrorDescriptor {
  if (error instanceof AuthenticationError) {
    return fromError(error, "authentication", "Sign in required", error.message, [LOGIN, HOME], {
      status: error.status,
    });
  }

  if (error instanceof ApiError) {
    const isAuthFailure = error.status === 401 || error.status === 403;
    return {
      category: isAuthFailure ? "authentication" : "api",
      title: error.data.title || (isAuthFailure ? "Sign in required" : "Request failed"),
      message: error.data.detail || error.message || "The request could not be completed.",
      diagnostics: {
        category: isAuthFailure ? "authentication" : "api",
        status: error.status || error.data.status,
        name: error.name,
        message: error.message,
        stack: error.stack,
        valueType: "Error",
      },
      recoveryActions: isAuthFailure ? [LOGIN, HOME] : [RELOAD, RETRY, HOME],
    };
  }

  if (error instanceof ValidationError) {
    return fromError(error, "validation", "Check the form", error.message, [BACK, HOME]);
  }

  if (error instanceof NetworkError) {
    return fromError(error, "network", "Connection problem", error.message, [RETRY, RELOAD, HOME]);
  }

  if (error instanceof WebSocketError) {
    return fromError(
      error,
      "websocket",
      error.problemDetail.title || "Realtime connection failed",
      error.problemDetail.detail || error.message,
      [RETRY, RELOAD, HOME],
      { status: error.problemDetail.status },
    );
  }

  if (error instanceof InvalidStateError) {
    return fromError(error, "invalid-state", "Screen state could not be restored", error.message, [
      RELOAD,
      HOME,
    ]);
  }

  if (error instanceof JSONError || error instanceof SyntaxError) {
    return fromError(error, "json", "Response could not be read", error.message, [RELOAD, HOME]);
  }

  if (isRouteErrorResponse(error)) {
    const dataMessage = getRouterDataMessage(error.data);
    const isNotFound = error.status === 404;
    return {
      category: isNotFound ? "not-found" : "route",
      title: isNotFound ? "Page not found" : error.statusText || "Page could not be loaded",
      message: isNotFound
        ? "The page you are looking for does not exist."
        : dataMessage || "The requested page could not be loaded.",
      diagnostics: {
        category: isNotFound ? "not-found" : "route",
        status: error.status,
        statusText: error.statusText,
        message: dataMessage,
        valueType: "RouteErrorResponse",
      },
      recoveryActions: isNotFound ? [HOME, BACK] : [RELOAD, HOME],
    };
  }

  if (error instanceof Error) {
    return fromError(error, "runtime", "Something went wrong", error.message, [RELOAD, HOME]);
  }

  if (typeof error === "string") {
    return {
      category: "unknown",
      title: "Something went wrong",
      message: error,
      diagnostics: { category: "unknown", message: error, valueType: "string" },
      recoveryActions: [RELOAD, HOME],
    };
  }

  return {
    category: "unknown",
    title: "Something went wrong",
    message: describeUnknown(error),
    diagnostics: {
      category: "unknown",
      message: describeUnknown(error),
      valueType: error === null ? "null" : typeof error,
    },
    recoveryActions: [RELOAD, HOME],
  };
}

function fromError(
  error: Error,
  category: ClientErrorCategory,
  title: string,
  message: string,
  recoveryActions: RecoveryActionDescriptor[],
  extraDiagnostics: Partial<ClientErrorDiagnostics> = {},
): ClientErrorDescriptor {
  return {
    category,
    title,
    message,
    diagnostics: {
      category,
      name: error.name,
      message: error.message,
      stack: error.stack,
      valueType: "Error",
      ...extraDiagnostics,
    },
    recoveryActions,
  };
}

function getRouterDataMessage(data: unknown): string | undefined {
  if (data && typeof data === "object" && "message" in data) {
    const message = (data as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }

  return typeof data === "string" ? data : undefined;
}

function describeUnknown(value: unknown): string {
  if (value && typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "An unknown object was thrown.";
    }
  }

  return "An unknown error occurred.";
}
