import { describe, expect, it } from 'vitest';
import { enabledProviders } from './useAuthProviders';

describe('enabledProviders', () => {
  it('lists every enabled provider, GitHub first', () => {
    expect(enabledProviders({ external: { google: true, github: true, email: true } })).toEqual(['github', 'google']);
  });

  it('leaves out disabled providers', () => {
    expect(enabledProviders({ external: { github: true, google: false } })).toEqual(['github']);
  });

  it('supports Google on its own', () => {
    expect(enabledProviders({ external: { github: false, google: true } })).toEqual(['google']);
  });

  it.each([null, {}, { external: {} }, 'not json'])('falls back to GitHub for %j', settings => {
    expect(enabledProviders(settings)).toEqual(['github']);
  });
});
