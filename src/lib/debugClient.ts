// lib/debugClient.ts
// Debug client for Monad Testnet:
//  • HTTP transport, no batching (each RPC visible as a separate POST)
//  • Optional console logging by patching window.fetch & WebSocket (no TS hacks)

import { createPublicClient, http } from 'viem';
import { monadTestnet } from './chain';

const DEFAULT_RPC = 'https://testnet-rpc.monad.xyz';
const RPC_HTTP = process.env.NEXT_PUBLIC_RPC_HTTP || DEFAULT_RPC;

// --- Debug flag helpers -------------------------------------------------------

const LS_KEY = 'rpcDebug';

export function enableRpcDebug(on: boolean) {
  try {
    if (on) localStorage.setItem(LS_KEY, '1');
    else localStorage.removeItem(LS_KEY);
  } catch {}
}

function isRpcDebugEnabled() {
  try {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      if (q.get('rpcdebug') === '1') {
        localStorage.setItem(LS_KEY, '1');
        return true;
      }
      if (q.get('rpcdebug') === '0') {
        localStorage.removeItem(LS_KEY);
        return false;
      }
      return localStorage.getItem(LS_KEY) === '1';
    }
  } catch {}
  return false;
}

// --- Optional: install console logging (browser-only) -------------------------

let patchesInstalled = false;

export function installRpcConsoleLogging() {
  if (patchesInstalled || typeof window === 'undefined') return;
  patchesInstalled = true;

  // Patch fetch (HTTP)
  const origFetch = window.fetch.bind(window);
  window.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
    try {
      if (init?.body && typeof init.body === 'string' && init.body.includes('"jsonrpc"')) {
        try {
          const payload = JSON.parse(init.body);
          const arr = Array.isArray(payload) ? payload : [payload];
          arr.forEach((p) => p?.method && console.log('[fetch rpc→]', p.method, p.params ?? []));
        } catch {}
      }
    } catch {}
    const res = await origFetch(url, init);
    try {
      const clone = res.clone();
      clone.json().then((j) => {
        const arr = Array.isArray(j) ? j : [j];
        arr.forEach((it) => {
          if (it?.error) console.warn('[fetch rpc← error]', it.error);
          else if ('result' in it) console.log('[fetch rpc← ok]', it.id);
        });
      }).catch(() => {});
    } catch {}
    return res;
  };

  // Patch WebSocket (WS) — assign via an `any` cast (no ts-expect-error needed)
  const OrigWS = window.WebSocket;
  (window as unknown as { WebSocket: any }).WebSocket = function (
    url: string | URL,
    protocols?: string | string[]
  ) {
    const ws: WebSocket = new OrigWS(url, protocols as any);
    const send = ws.send.bind(ws);

    ws.send = function (data: any) {
      try {
        const msg = typeof data === 'string' ? JSON.parse(data) : data;
        const arr = Array.isArray(msg) ? msg : [msg];
        arr.forEach((m) => m?.method && console.log('[ws rpc→]', m.method, m.params ?? []));
      } catch {}
      return send(data);
    };

    ws.addEventListener('message', (ev) => {
      try {
        const msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
        const arr = Array.isArray(msg) ? msg : [msg];
        arr.forEach((m) => {
          if (m?.error) console.warn('[ws rpc← error]', m.error);
          else if ('result' in m) console.log('[ws rpc← ok]', m.id);
        });
      } catch {}
    });

    return ws;
  };
}

// Auto-install logging if ?rpcdebug=1 is present
if (typeof window !== 'undefined' && isRpcDebugEnabled()) {
  installRpcConsoleLogging();
}

// --- Transport & client -------------------------------------------------------

export const debugClient = createPublicClient({
  chain: monadTestnet,
  // batch: false → one POST per RPC, visible in DevTools → Network
  transport: http(RPC_HTTP, { batch: false }),
});
