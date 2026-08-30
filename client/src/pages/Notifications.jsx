import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";

const ICONS = {
  friend_request: "👥",
  friend_accept: "👥",
  message: "💬",
  game: "🎮",
  squad_invite: "🚀",
};

function timeAgo(iso) {
  const diff =
    (Date.now() - new Date(iso).getTime()) / 1000;

  if (diff < 60) return "à l'instant";
  if (diff < 3600) {
    return `il y a ${Math.floor(diff / 60)} min`;
  }
  if (diff < 86400) {
    return `il y a ${Math.floor(diff / 3600)} h`;
  }

  return `il y a ${Math.floor(diff / 86400)} j`;
}

export default function Notifications() {
  const showToast = useToast();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const knownIds = useRef(new Set());
  const firstLoad = useRef(true);

  async function load(silent = false) {
    try {
      const res = await api.getNotifications();
      const notifications = res.notifications || [];

      if (firstLoad.current) {
        notifications.forEach((n) => {
          knownIds.current.add(n.id);
        });

        firstLoad.current = false;
      } else {
        const newNotifications = notifications.filter(
          (n) => !knownIds.current.has(n.id)
        );

        newNotifications.forEach((n) => {
          knownIds.current.add(n.id);

          setTimeout(() => {
            showToast(
              `${ICONS[n.type] || "🔔"} ${n.content}`
            );
          }, 100);
        });
      }

      setItems(notifications);

      if (!silent) {
        setLoading(false);
      }
    } catch (err) {
      console.error(
        "Erreur notifications :",
        err
      );

      if (!silent) {
        setLoading(false);
      }
    }
  }

  // Chargement initial
  useEffect(() => {
    load();
  }, []);

  // Actualisation automatique toutes les 2 secondes
  useEffect(() => {
    const interval = setInterval(() => {
      load(true);
    }, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  async function markRead(id) {
    try {
      await api.markNotificationRead(id);

      setItems((current) =>
        current.map((notification) =>
          notification.id === id
            ? {
                ...notification,
                read: true,
              }
            : notification
        )
      );
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    }
  }

  async function joinSquad(notification) {
    try {
      await api.joinSquad(notification.squad_id);

      await api.markNotificationRead(
        notification.id
      );

      showToast("✓ Squad rejointe");

      load();
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    }
  }

  async function markAll() {
    try {
      await api.markAllNotificationsRead();

      setItems((current) =>
        current.map((notification) => ({
          ...notification,
          read: true,
        }))
      );

      showToast(
        "✓ Notifications marquées comme lues"
      );
    } catch (err) {
      showToast(`⚠ ${err.message}`);
    }
  }

  const unreadCount = items.filter(
    (notification) => !notification.read
  ).length;

  return (
    <div>

      <div
        className="page-header notifications-header"
      >
        <div>
          <div className="eyebrow">
            GAMERLINK ALERTS
          </div>

          <h1>🔔 Notifications</h1>

          <p>
            {unreadCount > 0
              ? `${unreadCount} non lue${
                  unreadCount > 1 ? "s" : ""
                }`
              : "Tout est à jour"}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            className="btn btn-ghost"
            onClick={markAll}
          >
            ✓ Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="glass-card notifications-list">

        {loading && (
          <div className="empty-state">
            <div className="glyph">
              🔄
            </div>
            Chargement...
          </div>
        )}

        {!loading && items.length === 0 && (
          <div className="empty-state">
            <div className="glyph">
              🔔
            </div>
            Aucune notification pour le moment.
          </div>
        )}

        {items.map((notification, index) => (
          <div
            key={notification.id}
            className={`notification-row ${
              notification.read
                ? "notification-read"
                : "notification-unread"
            }`}
            onClick={() =>
              !notification.read &&
              markRead(notification.id)
            }
            style={{
              borderTop:
                index > 0
                  ? "1px solid var(--panel-border)"
                  : "none",
            }}
          >

            <div className="notification-icon">
              {ICONS[notification.type] || "🔔"}
            </div>

            <div className="notification-content">
              <div className="notification-text">
                {notification.content}
              </div>

              <div className="eyebrow">
                {timeAgo(notification.created_at)}
              </div>
            </div>

            {notification.type ===
              "squad_invite" &&
              notification.squad_id && (
                <button
                  className="btn btn-primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    joinSquad(notification);
                  }}
                >
                  Rejoindre
                </button>
              )}

            {!notification.read && (
              <span className="notification-dot" />
            )}

          </div>
        ))}

      </div>

      <div className="notifications-live">
        <span />
        Notifications actualisées automatiquement
      </div>

    </div>
  );
}