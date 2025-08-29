// src/app/api/mgid-leaderboard/route.ts
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
