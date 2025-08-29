// src/app/api/diag-openai/route.ts
export const runtime = 'nodejs';

function sanitize(s: string) {
  return s.replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
}
function last4(s: string) { return s ? s.slice(-4) : ''; }

export async function GET() {
  const KEY_NAME = (process.env['MFC_OPENAI_KEY_NAME'] || 'OPENAI_API_KEY_MFC').trim();
  const rawPref = (process.env[KEY_NAME] as string | undefined) ?? '';
  const rawDef = (process.env['OPENAI_API_KEY'] as string | undefined) ?? '';

  const trimmedPref = sanitize(rawPref);
  const trimmedDef = sanitize(rawDef);

  return Response.json({
    vercel: {
      VERCEL_ENV: process.env.VERCEL_ENV ?? '',
      VERCEL_URL: process.env.VERCEL_URL ?? '',
      VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID ?? '',
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
    },
    preferredKeyName: KEY_NAME,
    preferred: {
      present: !!trimmedPref,
      last4_trimmed: last4(trimmedPref),
      len: trimmedPref.length,
    },
    fallback: {
      present: !!trimmedDef,
      last4_trimmed: last4(trimmedDef),
      len: trimmedDef.length,
    },
  });
}
