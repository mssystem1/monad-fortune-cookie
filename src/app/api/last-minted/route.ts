// src/app/api/last-minted/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Rec = { tokenId: string; updatedAt: string };

const DIR  = path.join(process.cwd(), 'data');
const FILE = path.join(DIR, 'lastMinted.json');

async function ensureFile() {
  try { await fs.mkdir(DIR, { recursive: true }); } catch {}
  try { await fs.access(FILE); }
  catch { await fs.writeFile(FILE, JSON.stringify({}), 'utf8'); }
}
async function readAll(): Promise<Record<string, Rec>> {
  await ensureFile();
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')) as any; } catch { return {}; }
}
async function writeAll(data: Record<string, Rec>) {
  await ensureFile();
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), 'utf8');
}
const key = (chainId: string, contract: string, address: string) =>
  `${chainId}:${contract.toLowerCase()}:${address.toLowerCase()}`;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address  = (searchParams.get('address') || '').toLowerCase();
  const contract = (searchParams.get('contract') || '').toLowerCase();
  const chainId  = (searchParams.get('chainId') || '').trim();

  if (!address || !contract || !chainId) {
    return NextResponse.json({ error: 'Missing address/contract/chainId' }, { status: 400 });
  }

  const db = await readAll();
  const rec = db[key(chainId, contract, address)] ?? { tokenId: null, updatedAt: null };
  return NextResponse.json(rec);
}

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const address  = (searchParams.get('address') || '').toLowerCase();
  const contract = (searchParams.get('contract') || '').toLowerCase();
  const chainId  = (searchParams.get('chainId') || '').trim();

  if (!address || !contract || !chainId) {
    return NextResponse.json({ error: 'Missing address/contract/chainId' }, { status: 400 });
  }

  const body = await req.json().catch(() => ({} as any));
  const tokenId = body?.tokenId != null ? String(body.tokenId) : '';
  if (!tokenId) return NextResponse.json({ error: 'Missing tokenId' }, { status: 400 });

  const db = await readAll();
  const rec: Rec = { tokenId, updatedAt: new Date().toISOString() };
  db[key(chainId, contract, address)] = rec;
  await writeAll(db);
  return NextResponse.json(rec);
}
