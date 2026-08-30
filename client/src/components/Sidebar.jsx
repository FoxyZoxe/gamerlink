import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../lib/api.js";
import Avatar from "./Avatar.jsx";
import CurrentGame from "./CurrentGame.jsx";
import { statusMeta } from "../lib/status.js";

const NAV_ITEMS = [
  { to: "/", label: "Accueil", icon: "🏠", end: true },
  { to: "/amis", label: "Amis", icon: "👥" },
  { to: "/trouver", label: "Trouver des joueurs", icon: "🔎" },
  { to: "/messages", label: "Messages", icon: "💬" },
  { to: "/jeux", label: "Jeux", icon: "🎮" },
  { to: "/squads", label: "Squads", icon: "👥" },
  { to: "/notifications", label: "Notifications", icon: "🔔" },
];

const NAV_ITEMS_BOTTOM = [
  { to: "/profil", label: "Mon profil", icon: "👤" },
  { to: "/parametres", label: "Paramètres", icon: "⚙️" },
];

export default function Sidebar() {
  const {
    user,
    currentGame,
  } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  const meta = statusMeta(user?.status);

  // ==========================================================
  // BADGES
  // ==========================================================

  async function updateBadges() {
    try {
      const [
        notificationsData,
        conversationsData,
      ] = await Promise.all([
        api.getNotifications(),
        api.getConversations(),
      ]);

      const unreadNotifications =
        (notificationsData.notifications || []).filter(
          (notification) => !notification.read
        ).length;

      setNotificationCount(
        unreadNotifications
      );

      const unreadMessages =
        (conversationsData.conversations || []).reduce(
          (total, conversation) =>
            total +
            (conversation.unread || 0),
          0
        );

      setMessageCount(
        unreadMessages
      );
    } catch (err) {
      console.error(
        "Erreur badges sidebar :",
        err
      );
    }
  }

  useEffect(() => {
    if (!user) return;

    updateBadges();

    const interval = setInterval(() => {
      updateBadges();
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [user]);

  // ==========================================================
  // BADGES NAVIGATION
  // ==========================================================

  function getBadge(item) {
    if (item.to === "/notifications") {
      return notificationCount;
    }

    if (item.to === "/messages") {
      return messageCount;
    }

    return 0;
  }

  // ==========================================================
  // STATUT À AFFICHER
  // ==========================================================

  const displayStatus = currentGame
    ? `🎮 Joue à ${currentGame.name}`
    : meta.label;

    console.log(
  "🎮 SIDEBAR currentGame :",
  currentGame
);
  // ==========================================================
  // RENDU
  // ==========================================================

  return (
    <aside
      className={`sidebar ${
        collapsed ? "collapsed" : ""
      }`}
    >
      {/* =====================================================
          LOGO
          ===================================================== */}

      <div className="sidebar-logo">
        <img
          src="./gamerlink-icon.png"
          className="sidebar-logo-img"
          alt="GamerLink"
        />

        {!collapsed && (
          <span>GAMERLINK</span>
        )}

        <button
          className="sidebar-collapse-btn"
          onClick={() =>
            setCollapsed(
              (current) => !current
            )
          }
          aria-label={
            collapsed
              ? "Étendre la barre latérale"
              : "Réduire la barre latérale"
          }
          title={
            collapsed
              ? "Étendre"
              : "Réduire"
          }
        >
          {collapsed ? "»" : "«"}
        </button>
      </div>

      {/* =====================================================
          NAVIGATION PRINCIPALE
          ===================================================== */}

      <nav className="nav-group">
        {NAV_ITEMS.map((item) => {
          const badge =
            getBadge(item);

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `nav-item ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
            >
              <span className="icon">
                {item.icon}
              </span>

              {!collapsed && (
                <span className="nav-label">
                  {item.label}
                </span>
              )}

              {badge > 0 && (
                <span className="nav-badge nav-badge-new">
                  {badge > 99
                    ? "99+"
                    : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="nav-divider" />

      {/* =====================================================
          NAVIGATION BASSE
          ===================================================== */}

      <nav className="nav-group">
        {NAV_ITEMS_BOTTOM.map(
          (item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `nav-item ${
                  isActive
                    ? "active"
                    : ""
                }`
              }
            >
              <span className="icon">
                {item.icon}
              </span>

              {!collapsed && (
                <span>
                  {item.label}
                </span>
              )}
            </NavLink>
          )
        )}
      </nav>

      {/* =====================================================
          PROFIL
          ===================================================== */}

      <div className="sidebar-footer">

  {!collapsed && currentGame && (
    <CurrentGame compact />
  )}

  <div className="sidebar-me">
    <Avatar
      user={user}
      size={34}
    />

    {!collapsed && user && (
      <div>
        <div className="name">
          {user.username}
        </div>

        <div
          className={`status-label ${
            currentGame
              ? "playing"
              : ""
          }`}
        >
          {currentGame
            ? `🎮 Joue à ${currentGame.name}`
            : meta.label}
        </div>
      </div>
    )}
  </div>

</div>
    </aside>
  );
}