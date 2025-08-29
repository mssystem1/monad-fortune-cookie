import { NextResponse } from 'next/server';

export async function GET() {
  const appId = process.env.PRIVY_APP_ID;
  const providerAppId = process.env.MONAD_GAMES_PROVIDER_APP_ID || 'cmd8euall0037le0my79qpz42';

  if (!appId) {
    return NextResponse.json({ error: 'Missing PRIVY_APP_ID in env' }, { status: 500 });
  }
  return NextResponse.json({ appId, providerAppId });
}
