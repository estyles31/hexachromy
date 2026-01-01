// shared-frontend/components/Avatar.tsx
interface AvatarProps {
  displayName: string;
  avatarUrl?: string;
  size?: number;
}

export function Avatar({ displayName, avatarUrl, size = 40 }: AvatarProps) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        width={size}
        height={size}
        style={{ borderRadius: "50%" }}
        alt={displayName}
      />
    );
  }

  const initial = displayName?.[0]?.toUpperCase() ?? "?";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#666",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 600,
      }}
    >
      {initial}
    </div>
  );
}
