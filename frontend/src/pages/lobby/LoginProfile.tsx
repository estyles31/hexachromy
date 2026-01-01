// /frontend/src/pages/lobby/LoginProfile.tsx
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { signInWithPopup, signOut } from "firebase/auth";

import { auth, googleProvider } from "../../../../shared-frontend/firebase";
import { Avatar } from "../../../../shared-frontend/components/Avatar";
import { authFetch } from "../../auth/authFetch";

import type { PlayerPublicProfile } from "../../../../shared/models/PlayerProfile";

export default function LoginProfile({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [user, loading, error] = useAuthState(auth);
  const [profile, setProfile] = useState<PlayerPublicProfile | null>(null);

  const signIn = () => {
    signInWithPopup(auth, googleProvider).catch(console.error);
  };

  const signOutUser = () => {
    setProfile(null);
    signOut(auth).catch(console.error);
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    authFetch(user, "/api/profiles/me")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load profile (${r.status})`);
        return r.json();
      })
      .then((data) => setProfile(data as PlayerPublicProfile))
      .catch((err) => {
        console.error("Failed to load profile:", err);
        setProfile(null);
      });
  }, [user]);

  if (loading) return <div style={{ float: "right", margin: 10 }}>Loading...</div>;

  if (error) return <div style={{ float: "right", margin: 10 }}>Error: {error.message}</div>;

  if (!user) {
    return (
      <button onClick={signIn} style={{ float: "right", margin: 10 }}>
        Sign In with Google
      </button>
    );
  }

  const displayName = profile?.displayName ?? user.displayName ?? user.email ?? "User";

  const avatarUrl = profile?.avatarUrl;

  const content = (
    <>
      <Avatar displayName={displayName} avatarUrl={avatarUrl} size={32} />
      <span style={{ color: "#f5f5f5" }}>{displayName}</span>
    </>
  );

  return (
    <div
      style={{
        float: "right",
        margin: 10,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {onOpenSettings ? (
        <button
          onClick={onOpenSettings}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {content}
        </button>
      ) : (
        content
      )}
      <button onClick={signOutUser}>Sign Out</button>
    </div>
  );
}
