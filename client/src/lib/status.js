export const STATUS_META = {
  online: { label: "En ligne", color: "var(--online)" },
  in_game: { label: "En jeu", color: "var(--online)" },
  afk: { label: "AFK", color: "var(--afk)" },
  dnd: { label: "Ne pas déranger", color: "var(--dnd)" },
  invisible: { label: "Invisible", color: "var(--offline)" },
  offline: { label: "Hors ligne", color: "var(--offline)" },
};

export function statusMeta(status) {
  return STATUS_META[status] || STATUS_META.offline;
}

export function initials(name = "") {
  return name.slice(0, 2).toUpperCase();
}
