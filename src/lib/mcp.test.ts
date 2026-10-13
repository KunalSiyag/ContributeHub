import { describe, expect, it } from 'vitest';
import { countToolCalls, handleBody, handleMessage, ToolError, type McpTool } from './mcp';
import { mcpTools } from './mcp-tools.server';

const echo: McpTool = {
  name: 'echo',
  title: 'Echo',
  description: 'Returns its arguments.',
  inputSchema: { type: 'object', properties: { word: { type: 'string' } } },
  async run(args) {
    if (args.word === 'bad') throw new ToolError('word cannot be bad.');
    if (args.word === 'crash') throw new Error('secret internals');
    return { said: args.word ?? null };
  },
};
const call = (message: Record<string, unknown>) => handleMessage({ jsonrpc: '2.0', ...message }, [echo], 'Be kind.');

describe('MCP protocol', () => {
  it('negotiates the protocol version', async () => {
    const older = await call({ id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {} } });
    expect(older).toMatchObject({
      id: 1,
      result: { protocolVersion: '2025-03-26', capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'orion' }, instructions: 'Be kind.' },
    });
    const unknown = await call({ id: 2, method: 'initialize', params: { protocolVersion: '1999-01-01' } });
    expect(unknown).toMatchObject({ result: { protocolVersion: '2025-06-18' } });
  });

  it('stays quiet for notifications and client responses', async () => {
    expect(await call({ method: 'notifications/initialized' })).toBeNull();
    expect(await call({ id: 5, result: {} })).toBeNull();
  });

  it('lists tools without their code, marked read-only', async () => {
    const reply = await call({ id: 'a', method: 'tools/list' });
    expect(reply).toEqual({
      jsonrpc: '2.0',
      id: 'a',
      result: {
        tools: [
          {
            name: 'echo',
            title: 'Echo',
            description: 'Returns its arguments.',
            inputSchema: echo.inputSchema,
            annotations: { title: 'Echo', readOnlyHint: true, openWorldHint: true },
          },
        ],
      },
    });
  });

  it('returns results as text and structured content', async () => {
    expect(await call({ id: 3, method: 'tools/call', params: { name: 'echo', arguments: { word: 'hi' } } })).toEqual({
      jsonrpc: '2.0',
      id: 3,
      result: { content: [{ type: 'text', text: '{"said":"hi"}' }], structuredContent: { said: 'hi' } },
    });
  });

  it('reports tool failures as results, hiding unexpected errors', async () => {
    expect(await call({ id: 4, method: 'tools/call', params: { name: 'echo', arguments: { word: 'bad' } } })).toMatchObject({
      result: { isError: true, content: [{ type: 'text', text: 'word cannot be bad.' }] },
    });
    const crashed = await call({ id: 4, method: 'tools/call', params: { name: 'echo', arguments: { word: 'crash' } } });
    expect(JSON.stringify(crashed)).not.toContain('secret');
    expect(crashed).toMatchObject({ result: { isError: true } });
  });

  it('rejects bad requests with JSON-RPC errors', async () => {
    expect(await call({ id: 6, method: 'tools/call', params: { name: 'nope' } })).toMatchObject({ error: { code: -32602 } });
    expect(await call({ id: 7, method: 'tools/call', params: { name: 'echo', arguments: [1] } })).toMatchObject({ error: { code: -32602 } });
    expect(await call({ id: 8, method: 'resources/list' })).toMatchObject({ error: { code: -32601 } });
    expect(await handleMessage({ id: 9, method: 'ping' }, [echo], '')).toMatchObject({ id: 9, error: { code: -32600 } });
    expect(await handleMessage('ping', [echo], '')).toMatchObject({ id: null, error: { code: -32600 } });
    expect(await call({ id: { nested: true }, method: 'ping' })).toMatchObject({ id: null, error: { code: -32600 } });
  });

  it('handles batches', async () => {
    const replies = await handleBody(
      [
        { jsonrpc: '2.0', method: 'notifications/initialized' },
        { jsonrpc: '2.0', id: 1, method: 'ping' },
      ],
      [echo],
      ''
    );
    expect(replies).toEqual([{ jsonrpc: '2.0', id: 1, result: {} }]);
    expect(await handleBody([{ jsonrpc: '2.0', method: 'notifications/initialized' }], [echo], '')).toBeNull();
    expect(await handleBody([], [echo], '')).toMatchObject({ error: { code: -32600 } });
    expect(await handleBody(Array(11).fill({ jsonrpc: '2.0', id: 1, method: 'ping' }), [echo], '')).toMatchObject({ error: { code: -32600 } });
    expect(countToolCalls([{ method: 'tools/call' }, { method: 'ping' }, { method: 'tools/call' }])).toBe(2);
    expect(countToolCalls({ method: 'tools/list' })).toBe(0);
  });
});

describe('Orion MCP tools', () => {
  const tools = mcpTools('https://orion.test');
  const run = (name: string, args: Record<string, unknown>) =>
    handleMessage({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }, tools, '');

  it('have unique names and object schemas', () => {
    expect(new Set(tools.map(t => t.name)).size).toBe(tools.length);
    for (const tool of tools) expect(tool.inputSchema.type).toBe('object');
  });

  it('check arguments before asking GitHub', async () => {
    expect(await run('find_issues', { preset: 'everything' })).toMatchObject({
      result: { isError: true, content: [{ text: expect.stringContaining('preset must be one of') }] },
    });
    expect(await run('repo_report', { repository: 'not a repo' })).toMatchObject({
      result: { isError: true, content: [{ text: expect.stringContaining('owner/name') }] },
    });
    expect(await run('rising_repos', { topic: 'web 3; drop' })).toMatchObject({ result: { isError: true } });
  });

  it('answer guide questions from the checked list', async () => {
    const reply = (await run('contribution_guides', { category: 'perks', limit: 3 })) as { result: { structuredContent: { guides: Array<{ category: string }>; total: number } } };
    expect(reply.result.structuredContent.guides).toHaveLength(3);
    expect(reply.result.structuredContent.total).toBeGreaterThanOrEqual(10);
    expect(reply.result.structuredContent.guides.every(g => g.category === 'perks')).toBe(true);
  });
});
