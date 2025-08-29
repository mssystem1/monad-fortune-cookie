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
import { put, list } from '@vercel/blob';
import os from 'node:os';
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';

export type MgidRow = {
  username: string;
  embeddedWallet: `0x${string}`;
  totalScore: number;
  totalTransactions: number;
  updatedAt: number;
};

type Snapshot = {
  players: Record<string, MgidRow>; // key = embeddedWallet (lowercased)
};

const BLOB_PATH = 'mgid/leaderboard.json';
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN || ''; // set by Vercel when Blob is connected
const FALLBACK_FILE = path.join(os.tmpdir(), 'mgid-leaderboard.json');

/** Make sure the blob exists; return its URL. */
async function ensureBlobUrl(): Promise<string | null> {
  if (!TOKEN) return null; // no Blob configured in this env

  const { blobs } = await list({ prefix: BLOB_PATH, token: TOKEN });
  if (blobs.length > 0) return blobs[0].url;

  // Create an empty file at a stable path (no random suffix)
  const init: Snapshot = { players: {} };
  const res = await put(BLOB_PATH, JSON.stringify(init), {
    token: TOKEN,
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
  return res.url;
}

async function readSnapshot(): Promise<Snapshot> {
  // Local/dev fallback (no Blob token)
  if (!TOKEN) {
    try {
      const raw = await readFile(FALLBACK_FILE, 'utf8');
      return JSON.parse(raw) as Snapshot;
    } catch {
      const init: Snapshot = { players: {} };
      await writeFile(FALLBACK_FILE, JSON.stringify(init));
      return init;
    }
  }

  const url = await ensureBlobUrl();
  if (!url) return { players: {} };

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return { players: {} };
  return (await res.json()) as Snapshot;
}

async function writeSnapshot(next: Snapshot): Promise<void> {
  if (!TOKEN) {
    await writeFile(FALLBACK_FILE, JSON.stringify(next));
    return;
  }
  await put(BLOB_PATH, JSON.stringify(next), {
    token: TOKEN,
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

/** Upsert a player row. */
export async function savePlayer(row: MgidRow) {
  const wallet = row.embeddedWallet.toLowerCase() as `0x${string}`;
  const snap = await readSnapshot();

  const prev = snap.players[wallet];
  const merged: MgidRow = {
    username: row.username || prev?.username || '',
    embeddedWallet: wallet,
    totalScore: typeof row.totalScore === 'number' ? row.totalScore : (prev?.totalScore || 0),
    totalTransactions:
      typeof row.totalTransactions === 'number' ? row.totalTransactions : (prev?.totalTransactions || 0),
    updatedAt: row.updatedAt || Date.now(),
  };

  snap.players[wallet] = merged;
  await writeSnapshot(snap);
}

/** Read one player row (or null). */
export async function getPlayer(embeddedWallet: `0x${string}`) {
  const snap = await readSnapshot();
  return snap.players[embeddedWallet.toLowerCase() as `0x${string}`] || null;
}

/** Top N by totalScore (desc). */
export async function topPlayers(limit = 50): Promise<MgidRow[]> {
  const snap = await readSnapshot();
  const all = Object.values(snap.players || {});
  all.sort((a, b) => b.totalScore - a.totalScore || b.updatedAt - a.updatedAt);
  return all.slice(0, limit);
}
