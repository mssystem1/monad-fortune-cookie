// src/app/api/fortune/route.ts
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY missing on server' }, { status: 500 });
  }

  const { topic = '', vibe = 'optimistic', name = '' } = await req.json().catch(() => ({} as any));

  const prompt = [
    'Write a short, punchy fortune cookie message.',
    `Vibe: ${String(vibe || 'optimistic')}.`,
    topic ? `Topic: ${String(topic)}.` : '',
    name ? `Optional signer/name to nod at: ${String(name)}.` : '',
    'Limit to ~160 characters. Avoid quotes and emojis. Return plain text only.',
  ].filter(Boolean).join(' ');

  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise fortune-cookie copywriter.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.9,
        max_tokens: 120,
      }),
    });

    if (!resp.ok) {
      const errTxt = await resp.text().catch(() => '');
      return NextResponse.json({ error: `OpenAI error: ${resp.status} ${errTxt}` }, { status: 502 });
    }

    const data = await resp.json();
    const fortune = (data?.choices?.[0]?.message?.content ?? '').trim();
    if (!fortune) return NextResponse.json({ error: 'No content from model' }, { status: 502 });
    return NextResponse.json({ fortune });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'OpenAI request failed' }, { status: 502 });
  }
}
