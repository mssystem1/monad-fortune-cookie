
// src/app/api/mgid-leaderboard/route.ts
/*
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { listMGIDRecords } from '../../../server/mgidStore';

export async function GET() {
  try {
    const rows = await listMGIDRecords();
    return NextResponse.json(rows, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Failed to load MGID leaderboard' },
      { status: 500 }
    );
  }
}
*/
// src/app/api/mgid-leaderboard/route.ts
import { topPlayers } from '../../../server/mgidStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await topPlayers(50); // or 100
  // Keep your current response shape expected by MgidLeaderboardClient
  return Response.json({ rows });
}
