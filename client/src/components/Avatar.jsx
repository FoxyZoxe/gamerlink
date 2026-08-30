import { statusMeta, initials } from "../lib/status.js";

export default function Avatar({ user, size = 44, showRing = true }) {
  const meta = statusMeta(user?.status);
  const style = {
    width: size,
    height: size,
    "--ring-color": meta.color,
  };

  return (
    <div className={`avatar-ring ${user?.status === "in_game" ? "pulsing" : ""}`} style={showRing ? style : { width: size, height: size }}>
      <div className="avatar-circle" style={{ width: size, height: size, fontSize: size * 0.36 }}>
        {user?.avatar ? <img src={user.avatar} alt="" /> : initials(user?.username || "?")}
      </div>
    </div>
  );
}
