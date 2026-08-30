// db.js — petite couche de persistance basée fichier JSON.
//
// Objectif : rester simple à lire/auditer pour la V0.1, tout en respectant
// exactement le schéma défini dans le cahier des charges (section 21).
// Migrer vers Postgres/SQLite plus tard = changer uniquement ce fichier,
// aucune route ne doit avoir à changer.

import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "gamerlink.json");

const EMPTY_DB = {
  users: [],       // id, username, email, password_hash, avatar, banner, description, status, custom_status, favorite_games[], created_at
  friends: [],      // user_id, friend_id, status ("pending" | "accepted" | "blocked")
  games: [],        // id, name, executable, icon
  userGames: [],    // user_id, game_id, playtime_minutes
  messages: [],      // id, sender_id, receiver_id, content, created_at, read
  squads: [],        // id, owner_id, game_id, name, description, created_at
  squadMembers: [],  // squad_id, user_id
  notifications: [], // id, user_id, type, content, created_at, read
};

let cache = null;

async function ensureFile() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) {
    await writeFile(DB_FILE, JSON.stringify(seed(), null, 2));
  }
}

// Quelques données de démo pour ne pas ouvrir une app totalement vide.
function seed() {
  const now = new Date().toISOString();
  const games = [
    { id: "g-minecraft", name: "Minecraft", executable: "Minecraft.exe", icon: "minecraft" },
    { id: "g-ark", name: "ARK Survival Evolved", executable: "ShooterGame.exe", icon: "ark" },
    { id: "g-gtav", name: "GTA V", executable: "GTA5.exe", icon: "gtav" },
    { id: "g-valheim", name: "Valheim", executable: "valheim.exe", icon: "valheim" },
  ];
  return { ...EMPTY_DB, games };
}

async function load() {
  if (cache) return cache;
  await ensureFile();
  const raw = await readFile(DB_FILE, "utf-8");
  cache = JSON.parse(raw);
  return cache;
}

async function persist() {
  await writeFile(DB_FILE, JSON.stringify(cache, null, 2));
}

export const db = {
  async read() {
    return load();
  },
  async write(mutator) {
    const data = await load();
    const result = mutator(data);
    await persist();
    return result;
  },
  id() {
    return randomUUID();
  },
};
