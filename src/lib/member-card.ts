import type { ProfileBanner } from '@/types/database';

/**
 * Banners members can pick for their public profile (migration 10). Each is
 * drawn from Orion's own effect tokens: the blueprint grid, Graphite's
 * spectrum linework, and the green and blue atmosphere glows.
 */
export const BANNERS: Array<{ id: ProfileBanner; label: string }> = [
  { id: 'graphite', label: 'Graphite grid' },
  { id: 'spectrum', label: 'Spectrum line' },
  { id: 'merged', label: 'Merged glow' },
  { id: 'night', label: 'Night glow' },
];

export const isBanner = (value: unknown): value is ProfileBanner => BANNERS.some(banner => banner.id === value);
