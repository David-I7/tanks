import { fetchWithRetry } from "../utils/fetch";

export type User = {
  username: string;
  id: string;
};

export type AuthResponse = {
  accessToken: string;
} & User;

export type AuthRequest = {
  username: string;
};

export type AuthState = Partial<AuthResponse>;

let authState: AuthState = {};

export function isAuthenticated(): boolean {
  return authState.accessToken !== undefined;
}

export async function authenticate(
  request: AuthRequest,
): Promise<AuthResponse> {
  try {
    const authResponse: Awaited<AuthResponse> = await fetchWithRetry(() =>
      fetch("http://localhost:8080/api/v1/auth/guest", {
        method: "post",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(request),
      }),
    );

    authState = authResponse;
    return authResponse;
  } catch (e) {
    throw new Error("Server is currently unavailable");
  }
}
