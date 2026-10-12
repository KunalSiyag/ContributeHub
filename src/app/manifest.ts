import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Orion — open source contributor workspace',
    short_name: 'Orion',
    description: 'Find open source issues that fit your stack, track them until they merge, and keep program deadlines in view.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#171717',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
