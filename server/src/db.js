import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import pg from "pg";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "gamerlink.json");

const EMPTY_DB = {
  users: [],
  friends: [],
  games: [],
  userGames: [],
  messages: [],
  squads: [],
  squadMembers: [],
  notifications: [],
};

function seed() {
  return {
    ...EMPTY_DB,
    games: [
      {
        id: "g-minecraft",
        name: "Minecraft",
        executable: "Minecraft.exe",
        icon: "minecraft",
      },
      {
        id: "g-ark",
        name: "ARK Survival Evolved",
        executable: "ShooterGame.exe",
        icon: "ark",
      },
      {
        id: "g-gtav",
        name: "GTA V",
        executable: "GTA5.exe",
        icon: "gtav",
      },
      {
        id: "g-valheim",
        name: "Valheim",
        executable: "valheim.exe",
        icon: "valheim",
      },
    ],
  };
}

let cache = null;

/*
 * PostgreSQL est utilisé lorsque DATABASE_URL existe.
 * En local, sans DATABASE_URL, on garde le fichier JSON.
 */

const usePostgres = Boolean(process.env.DATABASE_URL);

const pool = usePostgres
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    })
  : null;

  if (pool) {
  pool.on("error", (err) => {
    console.error("❌ PostgreSQL pool error:", err.message);
  });
}

async function ensureJsonFile() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true });
  }

  if (!existsSync(DB_FILE)) {
    await writeFile(
      DB_FILE,
      JSON.stringify(seed(), null, 2),
      "utf-8"
    );
  }
}

async function ensurePostgres() {
  try {
    console.log("🔄 Connexion à PostgreSQL...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gamerlink_state (
        id INTEGER PRIMARY KEY,
        data JSONB NOT NULL
      )
    `);

    console.log("✅ Table gamerlink_state OK");

    const result = await pool.query(
      "SELECT data FROM gamerlink_state WHERE id = 1"
    );

    if (result.rows.length === 0) {
      console.log("🆕 Initialisation de la base GamerLink...");

      const initialData = seed();

      await pool.query(
        `
          INSERT INTO gamerlink_state (id, data)
          VALUES (1, $1::jsonb)
        `,
        [JSON.stringify(initialData)]
      );

      console.log("✅ Base GamerLink initialisée");
    } else {
      console.log("✅ Base GamerLink trouvée");
    }
  } catch (err) {
    console.error("❌ ERREUR POSTGRESQL :", err.message);
    console.error("Code PostgreSQL :", err.code || "inconnu");
    throw err;
  }
}

async function load() {
  if (cache) {
    return cache;
  }

  if (usePostgres) {
    await ensurePostgres();

    const result = await pool.query(
      "SELECT data FROM gamerlink_state WHERE id = 1"
    );

    cache = result.rows[0].data;
    return cache;
  }

  await ensureJsonFile();

  const raw = await readFile(DB_FILE, "utf-8");
  cache = JSON.parse(raw);

  return cache;
}

async function persist() {
  if (usePostgres) {
    await pool.query(
      `
      UPDATE gamerlink_state
      SET data = $1::jsonb
      WHERE id = 1
      `,
      [JSON.stringify(cache)]
    );

    return;
  }

  await writeFile(
    DB_FILE,
    JSON.stringify(cache, null, 2),
    "utf-8"
  );
}

export const db = {
  async read() {
    return load();
  },

  async write(mutator) {
    const data = await load();

    const result = await mutator(data);

    await persist();

    return result;
  },

  id() {
    return randomUUID();
  },
};