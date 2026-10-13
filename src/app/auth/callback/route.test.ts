import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const exchange = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: exchange } }),
}));

const { GET } = await import('./route');

const call = (query: string) => GET(new NextRequest(`http://localhost:3000/auth/callback?${query}`));
const target = (response: Response) => new URL(response.headers.get('location')!);

describe('GET /auth/callback', () => {
  beforeEach(() => {
    exchange.mockReset();
    exchange.mockResolvedValue({ error: null });
  });

  it('exchanges the code and redirects to the requested page', async () => {
    const response = await call('code=abc&next=%2Fissues%3Fview%3Dlist');
    expect(response.status).toBe(307);
    expect(target(response).href).toBe('http://localhost:3000/issues?view=list');
    expect(exchange).toHaveBeenCalledWith('abc', undefined);
  });

  it('passes the PKCE flow id through when the auth client adds one', async () => {
    await call('code=abc&sb_flow_id=0123456789abcdef0123456789abcdef');
    expect(exchange).toHaveBeenCalledWith('abc', { flowId: '0123456789abcdef0123456789abcdef' });
  });

  it.each(['//evil.example', 'https://evil.example', '/\\evil.example', '/auth/error'])(
    'falls back to the overview for next=%s',
    async next => {
      const response = await call(`code=abc&next=${encodeURIComponent(next)}`);
      expect(target(response).href).toBe('http://localhost:3000/dashboard');
    }
  );

  it('explains a GitHub denial without echoing provider text', async () => {
    const url = target(await call('error=access_denied&error_description=The+user+has+denied+your+application+access.'));
    expect(url.pathname).toBe('/auth/error');
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.searchParams.get('detail')).toBeNull();
    expect(exchange).not.toHaveBeenCalled();
  });

  it('reports a missing code', async () => {
    const url = target(await call('next=%2Fissues'));
    expect(url.searchParams.get('error')).toBe('missing_code');
    expect(exchange).not.toHaveBeenCalled();
  });

  it.each([
    ['pkce_code_verifier_not_found', 'other_browser'],
    ['bad_code_verifier', 'other_browser'],
    ['flow_state_expired', 'expired'],
    ['flow_state_not_found', 'expired'],
  ])('maps %s to %s', async (code, reason) => {
    exchange.mockResolvedValue({ error: { code, message: 'raw library message' } });
    const url = target(await call('code=abc'));
    expect(url.searchParams.get('error')).toBe(reason);
    expect(url.searchParams.get('detail')).toBeNull();
  });

  it('keeps unknown failures as a short technical detail', async () => {
    exchange.mockResolvedValue({ error: { code: 'unexpected_failure', message: 'x'.repeat(500) } });
    const url = target(await call('code=abc'));
    expect(url.searchParams.get('error')).toBe('unknown');
    expect(url.searchParams.get('detail')).toHaveLength(300);
  });
});
