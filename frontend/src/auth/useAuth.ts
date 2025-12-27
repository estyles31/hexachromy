import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../../../shared-frontend/firebase";
import type { User } from "firebase/auth";

export type DisplayUser = {
  uid: string;
  displayName?: string;
};

export function getUser(): DisplayUser | null {
  const [user, loading] = useAuthState(auth);

  if (loading) return null;
  if (!user) return null;

  return {
    uid: user.uid,
    displayName: user.displayName ?? undefined,
  };
}

export function useAuth(): User | null {
  const [user, loading] = useAuthState(auth);

  if (loading) return null;
  if (!user) return null;

  return user;
}
