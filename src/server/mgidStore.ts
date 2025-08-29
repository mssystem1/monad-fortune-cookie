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
