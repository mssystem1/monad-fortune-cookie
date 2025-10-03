// src/app/api/pinata/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const jwt = process.env.PINATA_JWT;
    if (!jwt) return NextResponse.json({ error: 'Missing PINATA_JWT' }, { status: 500 });

    const { b64, filename = 'monad-cookie.png' } = await req.json().catch(() => ({}));
    if (!b64) return NextResponse.json({ error: 'Missing b64' }, { status: 400 });

    const buffer = Buffer.from(b64, 'base64');

    // Node 18+ runtime: Blob & FormData are available via undici
    const fd = new FormData();
    fd.append('file', new Blob([buffer], { type: 'image/png' }), filename);

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: fd,
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      return NextResponse.json({ error: `Pinata error: ${res.status} ${txt}` }, { status: 502 });
    }
    const j = await res.json();
    const cid = j.IpfsHash || j.cid || j.Hash;
    if (!cid) return NextResponse.json({ error: 'Pinata: no CID in response' }, { status: 502 });

    return NextResponse.json({ cid });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
