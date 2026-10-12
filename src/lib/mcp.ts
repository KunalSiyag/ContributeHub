/**
 * A small, stateless Model Context Protocol server for the Streamable HTTP
 * transport: each POST carries one JSON-RPC message (or a batch, which
 * 2025-03-26 clients may send) and gets a plain JSON reply. No sessions and no
 * server-sent events, which the transport allows for a server that only
 * answers requests. Tools are read-only and see no cookies or accounts.
 */

export const MCP_VERSIONS = ['2025-06-18', '2025-03-26', '2024-11-05'];

export const SERVER_INFO = { name: 'orion', title: 'Orion', version: '1.0.0' };

export type ToolArgs = Record<string, unknown>;

export interface McpTool {
  name: string;
  title: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[]; additionalProperties?: boolean };
  /** Resolves to a JSON object; a thrown ToolError's message goes back to the model. */
  run: (args: ToolArgs) => Promise<Record<string, unknown>>;
}

/** A failure worded for the model to read and act on (bad input, rate limits). */
export class ToolError extends Error {}

type Id = string | number | null;
export type RpcResponse =
  | { jsonrpc: '2.0'; id: Id; result: unknown }
  | { jsonrpc: '2.0'; id: Id; error: { code: number; message: string } };

const MAX_BATCH = 10;

const ok = (id: Id, result: unknown): RpcResponse => ({ jsonrpc: '2.0', id, result });
export const rpcError = (id: Id, code: number, message: string): RpcResponse => ({ jsonrpc: '2.0', id, error: { code, message } });

/** Tool definitions as tools/list shows them. Every Orion tool only reads public data. */
export function listTools(tools: McpTool[]) {
  return tools.map(tool => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema,
    annotations: { title: tool.title, readOnlyHint: true, openWorldHint: true },
  }));
}

/** One JSON-RPC message to its response; null for notifications and client responses. */
export async function handleMessage(message: unknown, tools: McpTool[], instructions: string): Promise<RpcResponse | null> {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return rpcError(null, -32600, 'Invalid request.');
  const { jsonrpc, id, method, params } = message as Record<string, unknown>;
  const replyId = typeof id === 'string' || typeof id === 'number' ? id : null;
  if (jsonrpc !== '2.0') return rpcError(replyId, -32600, 'Invalid request: jsonrpc must be "2.0".');
  if (typeof method !== 'string') {
    // A response to a server request; this server never sends any, so there is nothing to do.
    return 'result' in message || 'error' in message ? null : rpcError(replyId, -32600, 'Invalid request: method is missing.');
  }
  if (id === undefined) return null;
  if (replyId === null) return rpcError(null, -32600, 'Invalid request: id must be a string or a number.');
  const p = params && typeof params === 'object' && !Array.isArray(params) ? (params as Record<string, unknown>) : {};

  switch (method) {
    case 'initialize': {
      const requested = typeof p.protocolVersion === 'string' ? p.protocolVersion : '';
      return ok(replyId, {
        protocolVersion: MCP_VERSIONS.includes(requested) ? requested : MCP_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions,
      });
    }
    case 'ping':
      return ok(replyId, {});
    case 'tools/list':
      return ok(replyId, { tools: listTools(tools) });
    case 'tools/call': {
      const tool = tools.find(t => t.name === p.name);
      if (!tool) return rpcError(replyId, -32602, `Unknown tool: ${String(p.name)}.`);
      const args = p.arguments ?? {};
      if (!args || typeof args !== 'object' || Array.isArray(args)) return rpcError(replyId, -32602, 'Tool arguments must be an object.');
      try {
        const data = await tool.run(args as ToolArgs);
        return ok(replyId, { content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
      } catch (error) {
        // Failures are results the model can read, not protocol errors.
        const text = error instanceof ToolError ? error.message : 'The tool failed. Try again shortly.';
        return ok(replyId, { content: [{ type: 'text', text }], isError: true });
      }
    }
    default:
      return rpcError(replyId, -32601, `Method not found: ${method}.`);
  }
}

/** A POST body (one message or a batch) to what goes back; null means "202, no body". */
export async function handleBody(body: unknown, tools: McpTool[], instructions: string): Promise<RpcResponse | RpcResponse[] | null> {
  if (!Array.isArray(body)) return handleMessage(body, tools, instructions);
  if (body.length === 0 || body.length > MAX_BATCH) return rpcError(null, -32600, `Invalid request: send 1 to ${MAX_BATCH} messages.`);
  const replies = await Promise.all(body.map(message => handleMessage(message, tools, instructions)));
  const sent = replies.filter((reply): reply is RpcResponse => reply !== null);
  return sent.length ? sent : null;
}

/** How many tool calls a body makes, for rate limiting. */
export function countToolCalls(body: unknown): number {
  const messages = Array.isArray(body) ? body : [body];
  return messages.filter(m => m && typeof m === 'object' && (m as { method?: unknown }).method === 'tools/call').length;
}
