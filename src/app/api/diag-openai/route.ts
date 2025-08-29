// src/app/api/diag-openai/route.ts
export const runtime = 'nodejs';

function hexTail(s: string, n = 8) {
  return Buffer.from(s).toString('hex').slice(-n);
}

export async function GET() {
  const raw = process.env.OPENAI_API_KEY ?? '';
  const trimmed = raw.trim();
  const sanitized = trimmed.replace(/[\u200B-\u200D\uFEFF]/g, '');

  return Response.json({
    present: Boolean(raw),
    rawLen: raw.length,
    trimmedLen: trimmed.length,
    sanitizedLen: sanitized.length,
    // last4 helps you confirm it’s the key you expect, without exposing the full secret:
    last4_trimmed: trimmed.slice(-4),
    // hex tails show if there is a trailing 0a (newline) etc.
    hexTail_raw: hexTail(raw),
    hexTail_trimmed: hexTail(trimmed),
    hexTail_sanitized: hexTail(sanitized),
  });
}
