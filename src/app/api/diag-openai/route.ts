export const runtime = 'nodejs';
function sanitize(s: string) { return (s || '').replace(/^\uFEFF/, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim(); }

export async function GET() {
  const KEY_NAME = (process.env['MFC_OPENAI_KEY_NAME'] || 'OPENAI_API_KEY_MFC_NEW').trim();
  const raw = (process.env[KEY_NAME] as string | undefined) ?? '';
  const trimmed = sanitize(raw);
  return Response.json({
    keyName: KEY_NAME,
    present: !!trimmed,
    last4: trimmed.slice(-4),
    len: trimmed.length,
    vercel: {
      env: process.env.VERCEL_ENV ?? '',
      url: process.env.VERCEL_URL ?? '',
      project: process.env.VERCEL_PROJECT_ID ?? '',
      sha: process.env.VERCEL_GIT_COMMIT_SHA ?? '',
    },
  });
}
