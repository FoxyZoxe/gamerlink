// Retire les champs sensibles avant d'envoyer un user au client.
export function publicUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

export function publicUsers(users) {
  return users.map(publicUser);
}
