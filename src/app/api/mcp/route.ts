import { NextResponse } from 'next/server';
import { countToolCalls, handleBody, MCP_VERSIONS, rpcError } from '@/lib/mcp';
import { MCP_INSTRUCTIONS, mcpTools } from '@/lib/mcp-tools.server';
import { allowRequest, clientKey } from '@/lib/rate-limit';

// Public, read-only data and no cookies are read, so any origin may call it.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, MCP-Protocol-Version, Mcp-Session-Id, Last-Event-ID',
  'Access-Control-Max-Age': '86400',
};
const ALLOW = { ...CORS, Allow: 'POST, OPTIONS' };

/** Tool calls per client per minute; they search GitHub, whose quota Orion shares. */
const CALLS_PER_MINUTE = 30;

/**
 * POST /api/mcp — Orion's Model Context Protocol server (Streamable HTTP with
 * JSON replies, no sessions). The tools are in lib/mcp-tools.server and the
 * discovery card is at /.well-known/mcp.json.
 */
export async function POST(request: Request) {
  const version = request.headers.get('mcp-protocol-version');
  if (version && !MCP_VERSIONS.includes(version)) {
    return NextResponse.json(rpcError(null, -32600, `Unsupported MCP-Protocol-Version. Use one of: ${MCP_VERSIONS.join(', ')}.`), {
      status: 400,
      headers: CORS,
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, 'Parse error: send a JSON-RPC message as JSON.'), { status: 400, headers: CORS });
  }

  const key = `mcp:${clientKey(request)}`;
  let limited = false;
  for (let i = 0; i < countToolCalls(body); i++) if (!allowRequest(key, CALLS_PER_MINUTE, 60_000)) limited = true;
  if (limited) {
    return NextResponse.json(rpcError(null, -32000, 'Too many tool calls. Wait a minute and try again.'), {
      status: 429,
      headers: { ...CORS, 'Retry-After': '60' },
    });
  }

  const reply = await handleBody(body, mcpTools(), MCP_INSTRUCTIONS);
  if (reply === null) return new Response(null, { status: 202, headers: CORS });
  return NextResponse.json(reply, { headers: { ...CORS, 'Cache-Control': 'no-store' } });
}

/** No server-initiated stream, so the transport asks for 405 here. */
export function GET() {
  return new Response('Orion MCP server. POST JSON-RPC messages here; the card is at /.well-known/mcp.json.\n', {
    status: 405,
    headers: { ...ALLOW, 'Content-Type': 'text/plain; charset=utf-8' },
  });
}

/** There are no sessions to end. */
export function DELETE() {
  return new Response(null, { status: 405, headers: ALLOW });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
