export const runtime = 'nodejs';

function sanitize(s: string) {
  return s.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}
function last4(s: string) { return s ? s.slice(-4) : ''; }
function hexTail(s: string, n = 8) { return Buffer.from(s).toString('hex').slice(-n); }

export async function GET() {
  const raw = process.env.OPENAI_API_KEY ?? '';
  const rawAlt = process.env.OPENAI_API_KEY_MFC ?? ''; // new name we’ll add as escape hatch

  const trimmed = (raw ?? '').trim();
  const sanitized = sanitize(raw);
  const trimmedAlt = (rawAlt ?? '').trim();
  const sanitizedAlt = sanitize(rawAlt);

  return Response.json({
    // Which deployment are you actually hitting?
    vercel: {
      VERCEL: process.env.VERCEL ?? '',
      VERCEL_ENV: process.env.VERCEL_ENV ?? '',
      VERCEL_URL: process.env.VERCEL_URL ?? '',
      VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID ?? '',
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
    },

    // Old name
    openai_key_default: {
      present: Boolean(raw),
      rawLen: raw.length,
      trimmedLen: trimmed.length,
      sanitizedLen: sanitized.length,
      last4_trimmed: last4(trimmed),
      last4_sanitized: last4(sanitized),
      hexTail_raw: hexTail(raw),
      hexTail_trimmed: hexTail(trimmed),
      hexTail_sanitized: hexTail(sanitized),
    },

    // New name (escape hatch)
    openai_key_mfc: {
      present: Boolean(rawAlt),
      trimmedLen: trimmedAlt.length,
      sanitizedLen: sanitizedAlt.length,
      last4_trimmed: last4(trimmedAlt),
      last4_sanitized: last4(sanitizedAlt),
    },
  });
}
