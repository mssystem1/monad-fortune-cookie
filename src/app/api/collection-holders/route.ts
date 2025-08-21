import { NextResponse } from 'next/server';

const BV_ENDPOINT = 'https://api.blockvision.org/v2/monad/collection/holders';

type BvHolder = {
  ownerAddress: string;
  amount: string;          // numeric string
  uniqueTokens?: number;   // for 1155; optional
  percentage?: string;
  lastTransaction?: string;
  isContract?: boolean;
  value?: string;
};

type BvResp = {
  code: number;
  message?: string;
  result?: {
    data?: BvHolder[];
    nextPageCursor?: string;
  };
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = (searchParams.get('address') || '').toLowerCase();
    const contract = (searchParams.get('contract') || '').toLowerCase();

    if (!address || !contract) {
      return NextResponse.json({ ok: false, error: 'address and contract are required' }, { status: 400 });
    }
    const key = process.env.BLOCKVISION_API_KEY;
    if (!key) {
      return NextResponse.json({ ok: false, error: 'Missing BLOCKVISION_API_KEY' }, { status: 500 });
    }

    // We may need to page through up to 1000 holders (limit 50/page → up to 20 pages).
    let cursor: string | undefined = undefined;
    let found: BvHolder | null = null;

    for (let page = 0; page < 21; page++) {
      const qs = new URLSearchParams({
        contractAddress: contract,
        limit: '50',
        ...(cursor ? { cursor } : {}),
      });
      const r = await fetch(`${BV_ENDPOINT}?${qs.toString()}`, {
        headers: { 'X-API-Key': key },
        cache: 'no-store',
      });

      const j = (await r.json()) as BvResp;
      if (!r.ok || j.code !== 0) {
        return NextResponse.json(
          { ok: false, error: j.message || 'BlockVision: collection holders failed' },
          { status: 502 }
        );
      }

      const holders = j.result?.data || [];
      for (const h of holders) {
        if ((h.ownerAddress || '').toLowerCase() === address) {
          found = h;
          break;
        }
      }
      if (found) break;

      const next = j.result?.nextPageCursor || '';
      if (!next) break;
      cursor = next;
    }

    const amount = found ? Number(found.amount) || 0 : 0;
    const uniqueTokens = found?.uniqueTokens ?? amount; // 721: same as amount

    return NextResponse.json({
      ok: true,
      address,
      contract,
      amount,
      uniqueTokens,
      // NOTE: this endpoint does NOT return token IDs.
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'error' }, { status: 500 });
  }
}
