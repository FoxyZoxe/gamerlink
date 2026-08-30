import { useEffect, useRef } from "react";
import { api } from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const ICONS = {
  friend_request: "👥",
  friend_accept: "👥",
  message: "💬",
  game: "🎮",
  squad_invite: "🚀",
};

export default function NotificationWatcher() {
  const showToast = useToast();
  const { user } = useAuth();

  const knownIds = useRef(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    if (!user) {
      knownIds.current.clear();
      firstLoad.current = true;
      return;
    }

    let active = true;

    async function checkNotifications() {
      try {
        const res = await api.getNotifications();
        const notifications = res.notifications || [];

        if (!active) return;

        // Premier chargement :
        // on mémorise les notifications existantes
        // sans afficher de toast.
        if (firstLoad.current) {
          notifications.forEach((notification) => {
            knownIds.current.add(notification.id);
          });

          firstLoad.current = false;
          return;
        }

        // On cherche uniquement les nouvelles notifications.
        const newNotifications =
          notifications.filter(
            (notification) =>
              !knownIds.current.has(notification.id)
          );

        newNotifications.forEach((notification) => {
          knownIds.current.add(notification.id);

          showToast(
            `${ICONS[notification.type] || "🔔"} ${
              notification.content
            }`
          );
        });
      } catch (err) {
        console.error(
          "Erreur notification watcher :",
          err
        );
      }
    }

    // Vérification immédiate
    checkNotifications();

    // Puis toutes les 2 secondes
    const interval = setInterval(
      checkNotifications,
      2000
    );

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [user, showToast]);

  return null;
}