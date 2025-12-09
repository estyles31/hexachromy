import type { User } from "firebase/auth";
import { useAuth } from "./useAuth";

/**
 * Fetch helper that injects the Firebase ID token for the given user.
 * Throws immediately if the user is missing or the token cannot be retrieved.
 */
type AuthFetchOptions = RequestInit & { debug?: boolean };

function describeRequest(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  return input instanceof Request ? input.url : "<unknown request>";
}

export async function authFetch(
  user: User | null | undefined,
  input: RequestInfo | URL,
  init?: AuthFetchOptions,
): Promise<Response> {
  if(!user) {
    user = useAuth();
  }

  if (!user) {
    throw new Error("Authentication required");
  }

  const { debug, ...requestInit } = init ?? {};

  const token = await user.getIdToken();

  const headers = new Headers(requestInit.headers ?? {});
  headers.set("Authorization", `Bearer ${token}`);

  if (debug) {
    console.info("[authFetch] attaching token", {
      request: describeRequest(input),
      uid: user.uid,
      hasHeader: headers.has("Authorization"),
      tokenPreview: `${token.slice(0, 12)}...`,
    });
  }

  return fetch(input, {
    ...requestInit,
    headers,
  });
}
