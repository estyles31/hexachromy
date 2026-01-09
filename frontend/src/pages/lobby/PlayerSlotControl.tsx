import { useState, useEffect } from "react";
import type { PlayerSlot } from "../../../../shared/models/PlayerSlot";
import { authFetch } from "../../auth/authFetch";
import { useAuth } from "../../auth/useAuth";
import type { PlayerPublicProfile } from "../../../../shared/models/PlayerProfile";

interface Props {
  slot: PlayerSlot;
  slotIndex: number;
  isCurrentUser: boolean;
  onChange: (slot: PlayerSlot) => void;
}

export default function PlayerSlotControl({ slot, slotIndex, isCurrentUser, onChange }: Props) {
  const [slotType, setSlotType] = useState<"human" | "bot" | "open">(slot.type);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlayerPublicProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const user = useAuth();

  // Search for players
  useEffect(() => {
    if (slotType !== "human" || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await authFetch(user, `/api/profiles/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const results = await res.json();
          setSearchResults(results);
        }
      } catch (err) {
        console.error("Error searching players:", err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, slotType, user]);

  // Handle slot type change
  const handleSlotTypeChange = (newType: "human" | "bot" | "open") => {
    setSlotType(newType);

    if (newType === "open") {
      onChange({
        type: "open",
        slotIndex,
      });
    } else if (newType === "bot") {
      onChange({
        type: "bot",
        slotIndex,
        botId: `bot-${crypto.randomUUID()}`,
        displayName: `Bot ${slotIndex + 1}`,
      });
    } else if (newType === "human") {
      // Keep current human slot or create empty one
      if (slot.type === "human") {
        onChange(slot);
      } else {
        // Will be filled when user selects from search
        onChange({
          type: "human",
          slotIndex,
          uid: "",
          displayName: "",
        });
      }
    }
  };

  // Handle player selection
  const handlePlayerSelect = (profile: PlayerPublicProfile) => {
    onChange({
      type: "human",
      slotIndex,
      uid: profile.uid,
      displayName: profile.displayName,
    });
    setSearchQuery("");
    setSearchResults([]);
  };

  if (isCurrentUser) {
    return (
      <div className="player-slot current-user">
        <strong>Player {slotIndex + 1}: You</strong>
      </div>
    );
  }

  return (
    <div className="player-slot">
      <label>
        Player {slotIndex + 1}
        <select value={slotType} onChange={(e) => handleSlotTypeChange(e.target.value as "human" | "bot" | "open")}>
          <option value="bot">Add Bot</option>
          <option value="open">Open Slot</option>
          <option value="human">Invite Player</option>
        </select>
      </label>

      {slotType === "human" && (
        <div className="player-search">
          <input
            type="text"
            placeholder="Search for player..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {searching && <div className="search-status">Searching...</div>}

          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map((profile) => (
                <li key={profile.uid} onClick={() => handlePlayerSelect(profile)}>
                  {profile.displayName}
                  {profile.avatarUrl && <img src={profile.avatarUrl} alt="" className="player-avatar" />}
                </li>
              ))}
            </ul>
          )}

          {slot.type === "human" && slot.uid && (
            <div className="selected-player">
              Selected: <strong>{slot.displayName}</strong>
            </div>
          )}
        </div>
      )}

      {slotType === "open" && (
        <div className="open-slot-info">This slot will be filled when someone joins the game.</div>
      )}
    </div>
  );
}
