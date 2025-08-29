// src/app/api/fortune/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function sanitizeKey(raw: string) {
  return (raw || '')
    .replace(/^\uFEFF/, '')                // BOM
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .trim();                               // whitespace/newlines
}

export async function POST(req: NextRequest) {
  // 👇 never dot-access; use a dynamic name so it can’t be inlined
  const KEY_NAME = (process.env['MFC_OPENAI_KEY_NAME'] || 'OPENAI_API_KEY_MFC_NEW').trim();
  const raw =
    (process.env[KEY_NAME] as string | undefined) ??
    (process.env['OPENAI_API_KEY'] as string | undefined) ??
    '';
  const apiKey = sanitizeKey(raw);
  if (!apiKey) return NextResponse.json({ error: 'OPENAI_API_KEY missing' }, { status: 500 });

  const client = new OpenAI({ apiKey });

  const { topic = '', vibe = 'optimistic', name = '' } =
    await req.json().catch(() => ({} as any));

  const prompt = [
    'Write a short, punchy fortune cookie message.',
    `Tone: ${vibe}.`,
    topic ? `Topic: ${topic}.` : '',
    name ? `Sign as: ${name}.` : '',
    'Max 240 chars.',
  ].filter(Boolean).join(' ');

  try {
    const r = await client.responses.create({ model: 'gpt-4o-mini', input: prompt });
    const fortune = (r.output_text ?? '').trim();
    if (!fortune) return NextResponse.json({ error: 'No content from model' }, { status: 502 });
    return NextResponse.json({ fortune });
  } catch (e: any) {
    return NextResponse.json({ error: `OpenAI error: ${e?.status ?? ''} ${e?.message ?? e}` }, { status: 502 });
  }
}
