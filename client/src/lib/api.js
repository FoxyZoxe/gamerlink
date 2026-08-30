const TOKEN_KEY = "gamerlink_token";

// Serveur GamerLink en ligne
const API_URL = "https://gamerlink.onrender.com";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(
  path,
  {
    method = "GET",
    body,
    auth = true,
  } = {}
) {
  const headers = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(
    `${API_URL}/api${path}`,
    {
      method,
      headers,
      body: body
        ? JSON.stringify(body)
        : undefined,
    }
  );

  let data = null;

  try {
    data = await res.json();
  } catch {
    // Pas de corps JSON
    // (ex: 204)
  }

  if (!res.ok) {
    throw new Error(
      data?.error ||
        `Erreur réseau (${res.status})`
    );
  }

  return data;
}

export const api = {
  // ==========================================================
  // AUTHENTIFICATION
  // ==========================================================

  register: (payload) =>
    request("/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  login: (payload) =>
    request("/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    }),

  logout: () =>
    request("/auth/logout", {
      method: "POST",
    }),

  me: () =>
    request("/auth/me"),

 // ==========================================================
// PROFIL
// ==========================================================

getProfile: (id) =>
  request(`/users/${id}`),

updateProfile: (payload) =>
  request("/users/me", {
    method: "PATCH",
    body: payload,
  }),

setCurrentGame: (gameId) =>
  request("/users/me", {
    method: "PATCH",
    body: {
      current_game_id: gameId,
    },
  }),

deleteAccount: () =>
  request("/users/me", {
    method: "DELETE",
  }),
  // ==========================================================
  // AMIS
  // ==========================================================

  getFriends: () =>
    request("/friends"),

  sendFriendRequest: (targetId) =>
    request(
      `/friends/request/${targetId}`,
      {
        method: "POST",
      }
    ),

  acceptFriendRequest: (requesterId) =>
    request(
      `/friends/accept/${requesterId}`,
      {
        method: "POST",
      }
    ),

  declineFriendRequest: (requesterId) =>
    request(
      `/friends/decline/${requesterId}`,
      {
        method: "POST",
      }
    ),

  removeFriend: (friendId) =>
    request(`/friends/${friendId}`, {
      method: "DELETE",
    }),

  blockUser: (targetId) =>
    request(
      `/friends/block/${targetId}`,
      {
        method: "POST",
      }
    ),

  searchPlayers: (params = {}) =>
    request(
      `/friends/search/players?${new URLSearchParams(
        Object.fromEntries(
          Object.entries(params).filter(
            ([, v]) =>
              v !== "" &&
              v != null
          )
        )
      )}`
    ),

  // ==========================================================
  // MESSAGES
  // ==========================================================

  getConversations: () =>
    request(
      "/messages/conversations"
    ),

  getThread: (userId) =>
    request(
      `/messages/with/${userId}`
    ),

  sendMessage: (
    userId,
    content
  ) =>
    request(
      `/messages/with/${userId}`,
      {
        method: "POST",
        body: {
          content,
        },
      }
    ),

  // ==========================================================
  // CHAT DE SQUAD
  // ==========================================================

  getSquadMessages: (squadId) =>
    request(
      `/messages/squad/${squadId}`
    ),

  sendSquadMessage: (
    squadId,
    content
  ) =>
    request(
      `/messages/squad/${squadId}`,
      {
        method: "POST",
        body: {
          content,
        },
      }
    ),

  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  getNotifications: () =>
    request("/notifications"),

  markNotificationRead: (id) =>
    request(
      `/notifications/${id}/read`,
      {
        method: "POST",
      }
    ),

  markAllNotificationsRead: () =>
    request(
      "/notifications/read-all",
      {
        method: "POST",
      }
    ),

  // ==========================================================
  // JEUX
  // ==========================================================

  getGamesCatalog: () =>
    request("/games"),

  getMyGames: () =>
    request("/games/mine"),

  addGameToLibrary: (gameId) =>
    request(
      `/games/mine/${gameId}`,
      {
        method: "POST",
      }
    ),

  addPlaytime: (
    gameId,
    minutes
  ) =>
    request("/games/playtime", {
      method: "POST",
      body: {
        gameId,
        minutes,
      },
    }),

  savePlaytime: (
    gameId,
    minutes
  ) =>
    request("/games/playtime", {
      method: "POST",
      body: {
        gameId,
        minutes,
      },
    }),

  // ==========================================================
  // SQUADS
  // ==========================================================

  getSquads: (gameId = "") =>
    request(
      `/squads${
        gameId
          ? `?game=${encodeURIComponent(
              gameId
            )}`
          : ""
      }`
    ),

  getMySquads: () =>
    request("/squads/mine"),

  createSquad: (payload) =>
    request("/squads", {
      method: "POST",
      body: payload,
    }),

  joinSquad: (id) =>
    request(
      `/squads/${id}/join`,
      {
        method: "POST",
      }
    ),

  leaveSquad: (id) =>
    request(
      `/squads/${id}/leave`,
      {
        method: "POST",
      }
    ),

  deleteSquad: (id) =>
    request(
      `/squads/${id}`,
      {
        method: "DELETE",
      }
    ),

  inviteToSquad: (
    squadId,
    userId
  ) =>
    request(
      `/squads/${squadId}/invite/${userId}`,
      {
        method: "POST",
      }
    ),
};