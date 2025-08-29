// src/app/api/fortune/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';        // avoid edge-env surprises
export const dynamic = 'force-dynamic'; // run on every request

// Remove trailing spaces, newlines, zero-width & BOM chars that often sneak in from dashboards.
function sanitizeKey(raw: string): string {
  // strip BOM
  let v = raw.replace(/^\uFEFF/, '');
  // strip zero-width chars (ZWSP/ZWNJ/ZWJ) and all whitespace (incl. \r\n, tabs)
  v = v.replace(/[\u200B-\u200D\uFEFF]/g, '').replace(/\s+/g, '');
  return v;
}

export async function POST(req: NextRequest) {
  const raw =   
  process.env.OPENAI_API_KEY_MFC ??   // prefer the new var name
  process.env.OPENAI_API_KEY ??       // fallback
  '';
  const apiKey = sanitizeKey(raw);

  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY missing on server' }, { status: 500 });
  }

  // Quick guard: if sanitizing changed the value length, we’ll log a hint (not the key)
  if (raw.length !== apiKey.length) {
    console.warn(
      `[fortune] OPENAI_API_KEY contained hidden whitespace/zero-width chars. ` +
      `RawLen=${raw.length}, SanitizedLen=${apiKey.length}`
    );
  }

  const { topic = '', vibe = 'optimistic', name = '' } =
    await req.json().catch(() => ({} as any));

  const prompt = [
    'Write a short, punchy fortune cookie message.',
    `Tone: ${vibe}.`,
    topic ? `Topic: ${topic}.` : '',
    name ? `Sign as: ${name}.` : '',
    'Max 240 chars.',
  ].filter(Boolean).join(' ');

  const client = new OpenAI({ apiKey });

  try {
    const r = await client.responses.create({
      model: 'gpt-4o-mini',
      input: prompt,
    });

    const fortune = (r.output_text ?? '').trim();
    if (!fortune) {
      return NextResponse.json({ error: 'No content from model' }, { status: 502 });
    }
    return NextResponse.json({ fortune });
  } catch (e: any) {
    // Surface status + message without leaking secrets
    const status = typeof e?.status === 'number' ? e.status : 502;
    console.error('[fortune] OpenAI error:', { status, message: e?.message });
    return NextResponse.json(
      { error: `OpenAI error: ${status} ${e?.message ?? e}` },
      { status: 502 }
    );
  }
}
