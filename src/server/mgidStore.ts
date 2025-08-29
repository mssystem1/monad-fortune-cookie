/*
import { promises as fs } from 'fs';
import path from 'path';

export type MGIDRecord = {
  username: string;
  embeddedWallet: `0x${string}`;
  totalScore: number;
  totalTransactions: number;
  updatedAt: number;
};

const DB_PATH =
  process.env.MGID_DB_PATH ||
  path.join(process.cwd(), '.data', 'mgid-leaderboard.json');

async function ensureDir() {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
}

async function readMap(): Promise<Record<string, MGIDRecord>> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8');
    return JSON.parse(raw) as Record<string, MGIDRecord>;
  } catch {
    return {};
  }
}

export async function upsertMGIDRecord(rec: MGIDRecord) {
  await ensureDir();
  const all = await readMap();
  all[rec.embeddedWallet.toLowerCase()] = rec;
  const tmp = DB_PATH + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(all, null, 2));
  await fs.rename(tmp, DB_PATH);
}

export async function listMGIDRecords(): Promise<MGIDRecord[]> {
  const all = await readMap();
  return Object.values(all).sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.totalTransactions !== a.totalTransactions)
      return b.totalTransactions - a.totalTransactions;
    return a.username.localeCompare(b.username);
  });
}
*/
// src/server/mgidStore.ts
import { kv } from '@vercel/kv';

export type MgidRow = {
  username: string;
  embeddedWallet: `0x${string}`;
  totalScore: number;
  totalTransactions: number;
  updatedAt: number;
};

const LB_KEY = 'mgid:leaderboard:score'; // sorted by totalScore (desc)

const playerKey = (embeddedWallet: string) =>
  `mgid:player:${embeddedWallet.toLowerCase()}` as const;

/** Upsert a player row and update leaderboard ranking (by totalScore). */
export async function savePlayer(row: MgidRow) {
  const embeddedWallet = row.embeddedWallet.toLowerCase() as `0x${string}`;
  const data: Record<string, string | number> = {
    username: row.username,
    embeddedWallet,
    totalScore: row.totalScore,
    totalTransactions: row.totalTransactions,
    updatedAt: row.updatedAt || Date.now(),
  };

  // hash per player
  await kv.hset(playerKey(embeddedWallet), data);
  // sorted set for leaderboard (score = totalScore)
  await kv.zadd(LB_KEY, { score: row.totalScore, member: embeddedWallet });
}

/** Read a single player row by embedded wallet. */
export async function getPlayer(embeddedWallet: `0x${string}`) {
  const h = await kv.hgetall<Record<string, any>>(playerKey(embeddedWallet));
  if (!h) return null;
  return {
    username: String(h.username ?? ''),
    embeddedWallet: (h.embeddedWallet ?? embeddedWallet).toLowerCase() as `0x${string}`,
    totalScore: Number(h.totalScore ?? 0),
    totalTransactions: Number(h.totalTransactions ?? 0),
    updatedAt: Number(h.updatedAt ?? 0),
  } as MgidRow;
}

/** Top N players by totalScore (desc). */
export async function topPlayers(limit = 50): Promise<MgidRow[]> {
  // returns [member, score, member, score, ...]
  const entries = (await kv.zrange(LB_KEY, 0, limit - 1, {
    rev: true,
    withScores: true,
  })) as Array<string | number>;

  const out: MgidRow[] = [];
  for (let i = 0; i < entries.length; i += 2) {
    const embeddedWallet = String(entries[i]) as `0x${string}`;
    const score = Number(entries[i + 1]);

    const h = await kv.hgetall<Record<string, any>>(playerKey(embeddedWallet));
    if (h) {
      out.push({
        username: String(h.username ?? ''),
        embeddedWallet: (h.embeddedWallet ?? embeddedWallet).toLowerCase() as `0x${string}`,
        totalScore: Number(h.totalScore ?? score),
        totalTransactions: Number(h.totalTransactions ?? 0),
        updatedAt: Number(h.updatedAt ?? Date.now()),
      });
    } else {
      // fallback if hash missing but rank exists
      out.push({
        username: '',
        embeddedWallet: embeddedWallet.toLowerCase() as `0x${string}`,
        totalScore: score,
        totalTransactions: 0,
        updatedAt: Date.now(),
      });
    }
  }
  return out;
}
