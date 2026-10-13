'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/*
 * WebMCP: browsers that expose navigator.modelContext (an experimental API
 * for AI agents working in the page) get Orion's MCP tools as in-page tools,
 * plus one to open Orion pages. Every other browser skips this entirely.
 */

type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

interface PageTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<ToolResult>;
}

interface ModelContext {
  provideContext?: (context: { tools: PageTool[] }) => void;
  registerTool?: (tool: PageTool) => { unregister?: () => void } | void;
}

const PAGES = ['/discover', '/starter', '/trending', '/events', '/bounties', '/alerts', '/issues', '/repos', '/assistant', '/resources', '/community', '/repo-bot'];

const text = (value: string, isError = false): ToolResult => ({ content: [{ type: 'text', text: value }], ...(isError && { isError }) });

async function rpc(method: string, params?: Record<string, unknown>) {
  const response = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  return (await response.json()) as { result?: unknown; error?: { message: string } };
}

export default function WebMcp() {
  const router = useRouter();

  useEffect(() => {
    const context = (navigator as Navigator & { modelContext?: ModelContext }).modelContext;
    if (!context || (!context.provideContext && !context.registerTool)) return;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const list = await rpc('tools/list').catch(() => null);
      const served = ((list?.result as { tools?: Array<{ name: string; description: string; inputSchema: Record<string, unknown> }> } | undefined)?.tools ?? []).map(
        (tool): PageTool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          execute: async input => {
            const reply = await rpc('tools/call', { name: tool.name, arguments: input }).catch(() => null);
            return (reply?.result as ToolResult | undefined) ?? text(reply?.error?.message ?? 'The tool failed. Try again shortly.', true);
          },
        })
      );
      if (cancelled) return;
      const tools: PageTool[] = [
        {
          name: 'open_orion_page',
          description: `Open one of Orion's pages in this tab: ${PAGES.join(', ')}.`,
          inputSchema: { type: 'object', properties: { page: { type: 'string', enum: PAGES } }, required: ['page'], additionalProperties: false },
          execute: async ({ page }) => {
            if (typeof page !== 'string' || !PAGES.includes(page)) return text(`page must be one of: ${PAGES.join(', ')}.`, true);
            router.push(page);
            return text(`Opened ${page}.`);
          },
        },
        ...served,
      ];
      if (context.provideContext) context.provideContext({ tools });
      else {
        for (const tool of tools) {
          const handle = context.registerTool!(tool);
          if (handle && handle.unregister) cleanups.push(() => handle.unregister!());
        }
      }
    })();

    return () => {
      cancelled = true;
      for (const cleanup of cleanups) cleanup();
    };
  }, [router]);

  return null;
}
