import { useAuth } from "../context/AuthContext.jsx";

export default function CurrentGame({
  compact = false,
}) {
  const { currentGame } = useAuth();

  if (!currentGame) {
    return null;
  }

  return (
    <div
      className={`current-game-display ${
        compact ? "compact" : ""
      }`}
    >
      <div className="current-game-display-icon">
        🎮
      </div>

      <div className="current-game-display-info">
        <span className="current-game-display-label">
          EN JEU
        </span>

        <strong>
          {currentGame.name}
        </strong>
      </div>

      <span className="current-game-display-dot" />
    </div>
  );
}