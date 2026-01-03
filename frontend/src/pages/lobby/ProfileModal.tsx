// frontend/src/pages/lobby/ProfileModal.tsx
import { useState, useEffect } from "react";
import { authFetch } from "../../auth/authFetch";
import type { User } from "firebase/auth";
import { updateProfile } from "firebase/auth";
import type { AvatarSource } from "../../../../shared/models/PlayerProfile";
import { Avatar } from "../../../../shared-frontend/components/Avatar";
import { getGravatarUrl } from "../../../../shared/utils/gravatar";
import "./ProfileModal.css";

interface Props {
  user: User;
  onClose: () => void;
}

export default function ProfileModal({ user, onClose }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [hideEmail, setHideEmail] = useState(false);
  const [avatarSource, setAvatarSource] = useState<AvatarSource>("gravatar");
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>();
  const [colors, setColors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (loading) return;

    switch (avatarSource) {
      case "google":
        setAvatarUrl(user.photoURL ?? undefined);
        break;
      case "gravatar":
        setAvatarUrl(getGravatarUrl(email));
        break;
      case "initial":
      default:
        setAvatarUrl(undefined);
        break;
    }
  }, [avatarSource, loading, user, email]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const [publicRes, privateRes] = await Promise.all([
          authFetch(user, "/api/profiles/me"),
          authFetch(user, "/api/profiles/me/private"),
        ]);

        const publicData = await publicRes.json();
        const privateData = await privateRes.json();

        setDisplayName(publicData.displayName);
        setEmail(privateData.email);
        setHideEmail(privateData.hideEmail);
        setAvatarSource(publicData.avatarSource ?? "gravatar");
        setAvatarUrl(publicData.avatarUrl);
        setColors(privateData.preferredColors || []);
        setIsFirstTime(!publicData.profileComplete);
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const addColor = () => {
    if (colors.length < 5) setColors([...colors, "#000000"]);
  };

  const removeColor = (idx: number) => {
    setColors(colors.filter((_, i) => i !== idx));
  };

  const updateColor = (idx: number, value: string) => {
    const updated = [...colors];
    updated[idx] = value;
    setColors(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await authFetch(user, "/api/profiles/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          hideEmail,
          preferredColors: colors,
          avatarSource,
          profileComplete: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to save profile");

      if (user.displayName !== displayName.trim()) {
        await updateProfile(user, { displayName: displayName.trim() });
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="lobby-modal-overlay">
        <div className="lobby-modal">
          <div className="lobby-modal__body">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="lobby-modal-overlay">
      <div className="lobby-modal">
        <div className="lobby-modal__header">
          <h2>{isFirstTime ? "Welcome! Set up your profile" : "Edit Profile"}</h2>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="lobby-modal__body">
            <label>
              Display Name:
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </label>

            <div>
              <div style={{ display: "flex" }}>
                {email}
                <label style={{ marginLeft: "10px" }}>
                  <input type="checkbox" checked={hideEmail} onChange={(e) => setHideEmail(e.target.checked)} />
                  Hide my email address
                </label>
              </div>
              <span className="hint">
                Hiding your email address makes it harder to invite you to games
                <br />
                (but maybe you want that)
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Avatar displayName={displayName} avatarUrl={avatarUrl} size={64} />
              <label>
                <input
                  type="radio"
                  name="avatarSource"
                  value="gravatar"
                  checked={avatarSource === "gravatar"}
                  onChange={() => setAvatarSource("gravatar")}
                />
                Use Gravatar (recommended)
              </label>
              {user.photoURL && (
                <label>
                  <input
                    type="radio"
                    name="avatarSource"
                    value="google"
                    checked={avatarSource === "google"}
                    onChange={() => setAvatarSource("google")}
                  />
                  Use Google profile
                </label>
              )}
              <label>
                <input
                  type="radio"
                  name="avatarSource"
                  value="initial"
                  checked={avatarSource === "initial"}
                  onChange={() => setAvatarSource("initial")}
                />
                Use first initial
              </label>
            </div>

            <div>
              <h3>Preferred Colors:</h3>
              {colors.length === 0 && <p>No colors selected yet.</p>}
              {colors.map((color, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span>{idx + 1}.</span>
                  <input type="color" value={color} onChange={(e) => updateColor(idx, e.target.value)} />
                  <span>{color}</span>
                  <button className="remove-button" type="button" onClick={() => removeColor(idx)}>
                    Remove
                  </button>
                </div>
              ))}
              {colors.length < 5 && (
                <button type="button" onClick={addColor}>
                  + Add color
                </button>
              )}
            </div>

            {error && <div className="error">{error}</div>}
          </div>

          <div className="lobby-modal__actions">
            {!isFirstTime && (
              <button type="button" onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={saving || !displayName.trim()}>
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
