import jwt from "jsonwebtoken";

// En V0.1, la clé peut vivre dans une variable d'env ; à défaut on retombe
// sur une valeur de dev locale (ne JAMAIS faire ça en production).
export const JWT_SECRET = process.env.GAMERLINK_JWT_SECRET || "dev-secret-change-me";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentification requise." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ error: "Session invalide ou expirée." });
  }
}
