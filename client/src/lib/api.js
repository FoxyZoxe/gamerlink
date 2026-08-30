const TOKEN_KEY = "gamerlink_token";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // pas de corps JSON (ex: 204)
  }

  if (!res.ok) {
    throw new Error(data?.error || `Erreur réseau (${res.status})`);
  }
  return data;
}

export const api = {
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  getProfile: (id) => request(`/users/${id}`),
  updateProfile: (payload) => request("/users/me", { method: "PATCH", body: payload }),
  setStatus: (status) => request("/users/me/status", { method: "PATCH", body: { status } }),
  deleteAccount: () => request("/users/me", { method: "DELETE" }),

  getFriends: () => request("/friends"),
  sendFriendRequest: (targetId) => request(`/friends/request/${targetId}`, { method: "POST" }),
  acceptFriendRequest: (requesterId) => request(`/friends/accept/${requesterId}`, { method: "POST" }),
  declineFriendRequest: (requesterId) => request(`/friends/decline/${requesterId}`, { method: "POST" }),
  removeFriend: (friendId) => request(`/friends/${friendId}`, { method: "DELETE" }),
  blockUser: (targetId) => request(`/friends/block/${targetId}`, { method: "POST" }),
  searchPlayers: (params = {}) =>
    request(`/friends/search/players?${new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null)))}`),

getConversations: () =>
  request("/messages/conversations"),

getThread: (userId) =>
  request(`/messages/with/${userId}`),

sendMessage: (userId, content) =>
  request(`/messages/with/${userId}`, {
    method: "POST",
    body: { content },
  }),

// 💬 CHAT DE SQUAD
getSquadMessages: (squadId) =>
  request(`/messages/squad/${squadId}`),

sendSquadMessage: (squadId, content) =>
  request(`/messages/squad/${squadId}`, {
    method: "POST",
    body: { content },
  }),

  getNotifications: () => request("/notifications"),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "POST" }),

  getGamesCatalog: () => request("/games"),
  getMyGames: () => request("/games/mine"),
  addGameToLibrary: (gameId) => request(`/games/mine/${gameId}`, { method: "POST" }),
  setCurrentGame: (gameId) => request("/games/status", { method: "PATCH", body: { gameId } }),

  getSquads: (gameId = "") => request(`/squads${gameId ? `?game=${encodeURIComponent(gameId)}` : ""}`),
  getMySquads: () => request("/squads/mine"),
  createSquad: (payload) => request("/squads", { method: "POST", body: payload }),
  joinSquad: (id) => request(`/squads/${id}/join`, { method: "POST" }),
  leaveSquad: (id) => request(`/squads/${id}/leave`, { method: "POST" }),
  deleteSquad: (id) => request(`/squads/${id}`, { method: "DELETE" }),
  inviteToSquad: (squadId, userId) => request(`/squads/${squadId}/invite/${userId}`, { method: "POST" }),
};
