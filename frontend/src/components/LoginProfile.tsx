// import React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signOut } from "firebase/auth";

export default function LoginProfile() {
  const [user, loading, error] = useAuthState(auth);

  const signIn = () => {
    signInWithPopup(auth, googleProvider).catch(console.error);
  };

  const signOutUser = () => {
    signOut(auth).catch(console.error);
  };

  if (loading) return <div>Loading...</div>;

  if (error) return <div>Error: {error.message}</div>;

  if (!user)
    return (
      <button onClick={signIn} style={{ float: "right", margin: 10 }}>
        Sign In with Google
      </button>
    );

  return (
    <div style={{ float: "right", margin: 10 }}>
      <img
        src={user.photoURL || ""}
        alt={user.displayName || "User"}
        style={{ width: 32, borderRadius: "50%", verticalAlign: "middle" }}
      />
      <span style={{ marginLeft: 8, marginRight: 8 }}>
        {user.displayName || user.email}
      </span>
      <button onClick={signOutUser}>Sign Out</button>
    </div>
  );
}
