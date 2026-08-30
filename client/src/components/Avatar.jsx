import { statusMeta, initials } from "../lib/status.js";

export default function Avatar({
  user,
  size = 44,
  showRing = true,
}) {
  const meta = statusMeta(user?.status);

  const ringStyle = {
    width: size,
    height: size,
    "--ring-color": meta.color,
  };

  const wrapperStyle = showRing
    ? ringStyle
    : {
        width: size,
        height: size,
      };

  return (
    <div
      className={`avatar-ring ${
        user?.status === "in_game" ? "pulsing" : ""
      }`}
      style={wrapperStyle}
    >
      <div
        className="avatar-circle"
        style={{
          width: size,
          height: size,
          fontSize: size * 0.36,
        }}
      >
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={`Avatar de ${user.username || "joueur"}`}
          />
        ) : (
          initials(user?.username || "?")
        )}
      </div>
    </div>
  );
}