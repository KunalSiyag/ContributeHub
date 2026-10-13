import { NextResponse } from 'next/server';
import { listTools, MCP_VERSIONS, SERVER_INFO } from '@/lib/mcp';
import { MCP_INSTRUCTIONS, mcpTools } from '@/lib/mcp-tools.server';
import { getSiteUrl } from '@/lib/site';

export const revalidate = 86400;

/** GET /.well-known/mcp.json — how agents find and connect to /api/mcp. */
export function GET() {
  const site = getSiteUrl();
  const endpoint = `${site}/api/mcp`;
  return NextResponse.json(
    {
      name: SERVER_INFO.name,
      title: SERVER_INFO.title,
      version: SERVER_INFO.version,
      description: MCP_INSTRUCTIONS,
      homepage: site,
      documentation: `${site}/llms.txt`,
      protocolVersion: MCP_VERSIONS[0],
      supportedProtocolVersions: MCP_VERSIONS,
      serverInfo: SERVER_INFO,
      transport: { type: 'streamable-http', url: endpoint, endpoint },
      remotes: [{ type: 'streamable-http', url: endpoint }],
      authentication: { required: false },
      capabilities: { tools: { listChanged: false } },
      tools: listTools(mcpTools(site)).map(({ name, title, description }) => ({ name, title, description })),
    },
    { headers: { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'public, s-maxage=86400' } }
  );
}
