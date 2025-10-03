import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ImgSize =
  | '256x256'
  | '512x512'
  | '1024x1024'
  | '1024x1792'
  | '1792x1024'
  | '1536x1024'
  | '1024x1536'
  | 'auto';

function normalizeSize(input: unknown, fallback: ImgSize = '1024x1024'): ImgSize {
  const v = String(input ?? '').trim();
  const allowed: ImgSize[] = [
    '256x256',
    '512x512',
    '1024x1024',
    '1024x1792',
    '1792x1024',
    '1536x1024',
    '1024x1536',
    'auto',
  ];
  return (allowed as readonly string[]).includes(v) ? (v as ImgSize) : fallback;
}

export async function POST(req: NextRequest) {
  try {
    // Accept JSON; if someone sends form-data, try to read that too.
    let prompt = '';
    let size: ImgSize = '1024x1024';

    try {
      const j = await req.json();
      prompt = (j?.prompt ?? '').toString().trim();
      size = normalizeSize(j?.size, size);
    } catch {
      try {
        const fd = await req.formData();
        prompt = (fd.get('prompt') as string || '').trim();
        size = normalizeSize(fd.get('size'), size);
      } catch {}
    }

    if (!prompt) {
      return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
    }

    const apiKey =
      (process.env.OPENAI_API_KEY_MFC_NEW?.trim() ||
       process.env.OPENAI_API_KEY?.trim() || '');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OpenAI API key' }, { status: 500 });
    }

    const client = new OpenAI({ apiKey });

    async function generate(model: string) {
      const r = await client.images.generate({ model, prompt, n: 1, size });
      const first = r?.data?.[0];
      let b64 = first?.b64_json as string | undefined;

      // Some responses may return URL (older behavior or provider proxy). Convert to b64.
      if (!b64 && first?.url) {
        const resp = await fetch(first.url);
        const buf = Buffer.from(await resp.arrayBuffer());
        b64 = buf.toString('base64');
      }
      if (!b64) throw new Error('No image returned');
      return b64;
    }

    let b64: string;
    try {
      // Primary (may 403 for unverified orgs)
      b64 = await generate('gpt-image-1');
    } catch (e: any) {
      // Fallback for 403 / restricted orgs
      const msg = String(e?.message || e);
      if (msg.includes('403') || msg.toLowerCase().includes('policy') || msg.includes('not allowed')) {
        b64 = await generate('dall-e-3');
      } else {
        throw e;
      }
    }

    return NextResponse.json({ b64 }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 502, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
