import type { User } from "firebase/auth";

/**
 * Fetch helper that injects the Firebase ID token for the given user.
 * Throws immediately if the user is missing or the token cannot be retrieved.
 */
export async function authFetch(
  user: User | null | undefined,
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  if (!user) {
    throw new Error("Authentication required");
  }

  const token = await user.getIdToken();

  const headers = new Headers(init?.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(input, {
    ...init,
    headers,
  });
}
